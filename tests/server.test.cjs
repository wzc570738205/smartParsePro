'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { Readable } = require('node:stream');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const sdk = require(path.join(root, 'packages/sdk/dist/index.cjs'));
const { createRequestHandler } = require(
  path.join(root, 'packages/server/src/server.cjs'),
);

async function request(handler, method, url, body) {
  const rawBody = body === undefined ? '' : JSON.stringify(body);
  const req = Readable.from(rawBody ? [Buffer.from(rawBody)] : []);
  req.method = method;
  req.url = url;
  req.headers = {
    'content-type': 'application/json',
  };

  const response = {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(value = '') {
      this.body += value;
    },
  };

  await handler(req, response);
  return {
    statusCode: response.statusCode,
    headers: response.headers,
    json: response.body ? JSON.parse(response.body) : undefined,
  };
}

test('POST /v1/parse always returns data.results as an array', async () => {
  const handler = createRequestHandler({ parser: sdk });
  const response = await request(handler, 'POST', '/v1/parse', {
    text: '鼓楼区中山北路1号 王五 13900000000',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(Array.isArray(response.json.data.results), true);
  assert.equal(response.json.data.results.length, 4);
  assert.equal(Object.hasOwn(response.json.data, 'result'), false);
});

test('POST /v1/parse represents no match with an empty array', async () => {
  const handler = createRequestHandler({ parser: sdk });
  const response = await request(handler, 'POST', '/v1/parse', {
    text: '这不是一个地址',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json.data.results, []);
  assert.deepEqual(response.json.data.warnings, ['NO_MATCH']);
});

test('batch endpoint isolates invalid items', async () => {
  const handler = createRequestHandler({ parser: sdk });
  const response = await request(handler, 'POST', '/v1/parse/batch', {
    items: [
      { id: 'ok', text: '北京市朝阳区望京街道阜通东大街6号' },
      { id: 'bad', text: '' },
    ],
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json.data.items[0].results.length, 1);
  assert.equal(response.json.data.items[1].results.length, 0);
  assert.equal(response.json.data.items[1].error.code, 'INVALID_INPUT');
});

test('invalid JSON content type is rejected with a real HTTP status', async () => {
  const handler = createRequestHandler({ parser: sdk });
  const req = Readable.from([Buffer.from('{}')]);
  req.method = 'POST';
  req.url = '/v1/parse';
  req.headers = { 'content-type': 'text/plain' };
  const response = {
    writeHead(statusCode) {
      this.statusCode = statusCode;
    },
    end(value) {
      this.body = value;
    },
  };

  await handler(req, response);
  assert.equal(response.statusCode, 415);
});
