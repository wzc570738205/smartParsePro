'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('browser global bundle exposes SmartParse and returns candidate arrays', () => {
  const root = path.resolve(__dirname, '..');
  const bundle = fs.readFileSync(
    path.join(
      root,
      'packages/sdk/dist/browser/address-smart-parse.global.js',
    ),
    'utf8',
  );
  const context = {};
  context.globalThis = context;
  vm.runInNewContext(bundle, context, {
    filename: 'address-smart-parse.global.js',
  });

  assert.equal(typeof context.SmartParse.parseAddress, 'function');
  const results = context.SmartParse.parseAddress('鼓楼区中山北路1号');
  assert.equal(Array.isArray(results), true);
  assert.equal(results.length, 4);
});
