'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const cjs = require(path.join(root, 'packages/sdk/dist/index.cjs'));

test('CommonJS returns one candidate for a complete unambiguous address', () => {
  const results = cjs.parseAddress(
    '浙江省金华市婺城区西关街道金磐路15180231234 李节霁',
  );

  assert.equal(Array.isArray(results), true);
  assert.equal(results.length, 1);
  assert.equal(results[0].province.name, '浙江省');
  assert.equal(results[0].city.name, '金华市');
  assert.equal(results[0].county.name, '婺城区');
  assert.equal(results[0].street.name, '西关街道');
  assert.equal(results[0].detail, '金磐路');
  assert.equal(results[0].name, '李节霁');
  assert.equal(results[0].phone, '15180231234');
});

test('ambiguous county returns every plausible path instead of selecting one', () => {
  const results = cjs.parseAddress('鼓楼区中山北路1号 王五 13900000000');
  const paths = results.map(
    (candidate) =>
      `${candidate.province.name}/${candidate.city.name}/${candidate.county.name}`,
  );

  assert.equal(results.length, 4);
  assert.deepEqual(
    new Set(paths),
    new Set([
      '江苏省/南京市/鼓楼区',
      '江苏省/徐州市/鼓楼区',
      '福建省/福州市/鼓楼区',
      '河南省/开封市/鼓楼区',
    ]),
  );
  assert.equal(results.every((candidate) => candidate.warnings.includes('AMBIGUOUS_ADDRESS')), true);
  assert.equal(results.some((candidate) => Object.hasOwn(candidate, 'selected')), false);
});

test('embedded postal code, phone and identity card are extracted', () => {
  const [result] = cjs.parseAddress(
    '雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810',
  );

  assert.equal(result.postalCode, '710061');
  assert.equal(result.phone, '13593464918');
  assert.equal(result.idCard, '211381198512096810');
  assert.equal(result.detail, '高新四路高新大都荟');
  assert.equal(result.province.name, '陕西省');
  assert.equal(result.city.name, '西安市');
});

test('a contextual city alias removes incompatible same-name county paths', () => {
  const results = cjs.parseAddress(
    '马云 河北省石家庄新华区中华北大街68号鹿城商务中心6号楼1413室',
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].province.name, '河北省');
  assert.equal(results[0].city.name, '石家庄市');
  assert.equal(results[0].county.name, '新华区');
  assert.equal(results[0].name, '马云');
});

test('no administrative match returns an empty array', () => {
  assert.deepEqual(cjs.parseAddress('这不是地址 张三 13800138000'), []);
});

test('maxCandidates limits output and reports truncation', () => {
  const results = cjs.parseAddress('鼓楼区中山北路1号', { maxCandidates: 2 });
  assert.equal(results.length, 2);
  assert.equal(
    results.every((candidate) => candidate.warnings.includes('CANDIDATES_TRUNCATED')),
    true,
  );
});

test('parseAddress accepts V3-style custom division data as its second argument', () => {
  const customAddressData = [
    {
      code: '99',
      name: '测试省',
      children: [
        {
          code: '9901',
          name: '示例市',
          children: [
            {
              code: '990101',
              name: '未来区',
              children: [
                { code: '990101001', name: '星河街道' },
              ],
            },
          ],
        },
      ],
    },
  ];

  assert.deepEqual(cjs.parseAddress('测试省示例市未来区星河街道创新路1号'), []);
  const results = cjs.parseAddress(
    '测试省示例市未来区星河街道创新路1号 测试员 13800138000',
    customAddressData,
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].province.name, '测试省');
  assert.equal(results[0].city.name, '示例市');
  assert.equal(results[0].county.name, '未来区');
  assert.equal(results[0].street.name, '星河街道');
  assert.equal(results[0].detail, '创新路1号');
  assert.equal(results[0].name, '测试员');
});

test('ESM entry has the same array contract', async () => {
  const esmPath = pathToFileURL(path.join(root, 'packages/sdk/dist/index.mjs')).href;
  const esm = await import(esmPath);
  const results = esm.parseAddress('北京市朝阳区望京街道阜通东大街6号');

  assert.equal(Array.isArray(results), true);
  assert.equal(results.length, 1);
  assert.equal(results[0].county.name, '朝阳区');
});

test('legacy entry is explicit and maps the first candidate to the old shape', () => {
  const legacy = require(path.join(root, 'packages/sdk/dist/legacy.cjs'));
  const result = legacy.smart('北京市朝阳区望京街道阜通东大街6号');

  assert.equal(Array.isArray(result), false);
  assert.equal(result.province, '北京市');
  assert.equal(result.county, '朝阳区');
});
