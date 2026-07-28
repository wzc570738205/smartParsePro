'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const { parseAddress } = require(path.join(root, 'packages/sdk/dist/index.cjs'));
const regressionCases = require(path.join(root, 'tests/fixtures/v4-regression.json'));
const generatedCases = require(path.join(root, 'tests/fixtures/v4-generated.json'));

function candidateValue(candidate, key) {
  if (['province', 'city', 'county', 'street'].includes(key)) {
    return candidate[key] && candidate[key].name;
  }
  return candidate[key];
}

function candidateMatches(candidate, expected) {
  return Object.entries(expected).every(
    ([key, expectedValue]) => candidateValue(candidate, key) === expectedValue,
  );
}

function evaluate(cases) {
  const failures = [];
  for (const fixture of cases) {
    const results = parseAddress(fixture.input);
    if (!results.some((candidate) => candidateMatches(candidate, fixture.expected))) {
      failures.push({
        id: fixture.id,
        input: fixture.input,
        expected: fixture.expected,
        actual: results.slice(0, 3),
      });
    }
  }
  return failures;
}

test('the seven user-provided regression cases match every expected field', () => {
  const failures = evaluate(regressionCases);
  assert.deepEqual(failures, []);
});

test('generated nationwide hierarchy corpus contains more than one hundred cases', () => {
  assert.equal(generatedCases.length >= 100, true);
  assert.equal(new Set(generatedCases.map((fixture) => fixture.id)).size, generatedCases.length);
});

test('every generated nationwide case contains its expected administrative path', () => {
  const failures = evaluate(generatedCases);
  assert.deepEqual(failures.slice(0, 10), []);
  assert.equal(failures.length, 0);
});
