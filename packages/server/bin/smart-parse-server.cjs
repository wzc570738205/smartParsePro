#!/usr/bin/env node
'use strict';

const { createSmartParseServer } = require('../src/server.cjs');

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const host = argumentValue('host', process.env.SMART_PARSE_HOST || '0.0.0.0');
const port = Number(argumentValue('port', process.env.SMART_PARSE_PORT || '1399'));
const server = createSmartParseServer({ host, port });

server
  .start()
  .then(() => {
    process.stdout.write(`smart-parse-server listening on http://${host}:${port}\n`);
  })
  .catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });

async function shutdown() {
  try {
    await server.stop();
    process.exit(0);
  } catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
