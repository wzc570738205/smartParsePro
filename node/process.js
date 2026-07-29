'use strict';

// V4 源码启动器：检查端口后，将 API Server 交给 forever 守护。
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOST = process.env.SMART_PARSE_HOST || '0.0.0.0';
const PORT = Number(process.env.SMART_PARSE_PORT || 1399);
const FOREVER_UID = process.env.SMART_PARSE_UID || 'smart-parse-api';

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`SMART_PARSE_PORT 不是有效端口：${process.env.SMART_PARSE_PORT}`);
}

// 兼容 process.js 位于项目根目录或项目的 node/ 目录。
const projectRoot = [__dirname, path.resolve(__dirname, '..')].find((directory) =>
  fs.existsSync(
    path.join(directory, 'packages/server/bin/smart-parse-server.cjs'),
  ),
);

if (!projectRoot) {
  throw new Error(
    '找不到 V4 服务入口 packages/server/bin/smart-parse-server.cjs，请把 process.js 放在项目根目录或 node/ 目录。',
  );
}

const serverEntry = path.join(
  projectRoot,
  'packages/server/bin/smart-parse-server.cjs',
);
const logDirectory = path.join(projectRoot, 'logs');

fs.mkdirSync(logDirectory, { recursive: true });

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
    path.join(logDirectory, 'forever.log'),
    '-o',
    path.join(logDirectory, 'output.log'),
    '-e',
    path.join(logDirectory, 'error.log'),
    serverEntry,
    '--host',
    HOST,
    '--port',
    String(PORT),
  ];

  const foreverProcess = spawn('forever', args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  foreverProcess.once('error', (error) => {
    console.error('启动服务失败，请确认已经全局安装 forever：', error.message);
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
