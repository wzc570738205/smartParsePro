#!/usr/bin/env node
'use strict';

// Start the packaged V4 API Server under a globally installed forever process.
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOST = process.env.SMART_PARSE_HOST || '0.0.0.0';
const PORT = Number(process.env.SMART_PARSE_PORT || 1399);
const FOREVER_UID = process.env.SMART_PARSE_UID || 'smart-parse-api';
const SERVER_ENTRY = path.resolve(
  __dirname,
  '../bin/smart-parse-server.cjs',
);
const LOG_DIRECTORY = path.resolve(
  process.env.SMART_PARSE_LOG_DIR || path.join(process.cwd(), 'logs'),
);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`SMART_PARSE_PORT 不是有效端口：${process.env.SMART_PARSE_PORT}`);
}

fs.mkdirSync(LOG_DIRECTORY, { recursive: true });

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();

    tester.once('error', (error) => {
      if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        resolve(false);
        return;
      }
      reject(error);
    });

    tester.once('listening', () => {
      tester.close((error) => (error ? reject(error) : resolve(true)));
    });

    tester.listen(port, '0.0.0.0');
  });
}

function startServer() {
  const args = [
    'start',
    '--uid',
    FOREVER_UID,
    '-a',
    '-l',
    path.join(LOG_DIRECTORY, 'forever.log'),
    '-o',
    path.join(LOG_DIRECTORY, 'output.log'),
    '-e',
    path.join(LOG_DIRECTORY, 'error.log'),
    SERVER_ENTRY,
    '--host',
    HOST,
    '--port',
    String(PORT),
  ];

  const foreverProcess = spawn('forever', args, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  foreverProcess.once('error', (error) => {
    console.error('启动失败，请先执行 npm install --global forever：', error.message);
    process.exitCode = 1;
  });

  foreverProcess.once('exit', (code) => {
    if (code !== 0) {
      console.error(`forever 启动失败，退出码：${code}`);
      process.exitCode = code || 1;
    }
  });
}

async function checkAndStart() {
  const available = await isPortAvailable(PORT);

  if (!available) {
    console.log(`${new Date().toISOString()} - 端口 ${PORT} 已被占用，无需启动。`);
    return;
  }

  console.log(`${new Date().toISOString()} - 端口 ${PORT} 可用，启动 V4 API 服务。`);
  startServer();
}

checkAndStart().catch((error) => {
  console.error('检查并启动服务失败：', error);
  process.exitCode = 1;
});
