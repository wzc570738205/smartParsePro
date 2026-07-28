'use strict';

const path = require('node:path');

const root = path.resolve(__dirname, '..');
const {
  PARSER_VERSION,
  parseAddress,
} = require(path.join(root, 'packages/sdk/dist/index.cjs'));
const regressionCases = require(path.join(root, 'tests/fixtures/v4-regression.json'));
const generatedCases = require(path.join(root, 'tests/fixtures/v4-generated.json'));

function value(candidate, key) {
  if (['province', 'city', 'county', 'street'].includes(key)) {
    return candidate[key] && candidate[key].name;
  }
  return candidate[key];
}

function evaluate(name, fixtures) {
  const started = process.hrtime.bigint();
  const byCategory = new Map();
  let passed = 0;
  const failures = [];

  for (const fixture of fixtures) {
    const results = parseAddress(fixture.input);
    const matched = results.some((candidate) =>
      Object.entries(fixture.expected).every(
        ([key, expected]) => value(candidate, key) === expected,
      ),
    );
    const category = fixture.category || 'manual-regression';
    const stats = byCategory.get(category) || { total: 0, passed: 0 };
    stats.total += 1;
    if (matched) {
      passed += 1;
      stats.passed += 1;
    } else {
      failures.push({ id: fixture.id, input: fixture.input, results: results.slice(0, 3) });
    }
    byCategory.set(category, stats);
  }

  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  return {
    name,
    total: fixtures.length,
    passed,
    failed: fixtures.length - passed,
    accuracy: fixtures.length ? passed / fixtures.length : 0,
    elapsedMs: Math.round(elapsedMs * 1000) / 1000,
    categories: Object.fromEntries(byCategory),
    failures: failures.slice(0, 10),
  };
}

console.log(
  JSON.stringify(
    {
      parserVersion: PARSER_VERSION,
      reports: [
        evaluate('manual-regression', regressionCases),
        evaluate('generated-hierarchy', generatedCases),
      ],
    },
    null,
    2,
  ),
);
