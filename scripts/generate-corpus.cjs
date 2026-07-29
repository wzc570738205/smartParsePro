'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const divisions = require(path.join(root, 'packages/core/data/divisions.json'));
const outputPath = path.join(root, 'tests/fixtures/v4-generated.json');
const names = ['张伟', '王芳', '李娜', '刘洋', '陈晨', '杨帆'];
const details = ['幸福路88号', '人民路16号', '建设街20号'];
const phones = ['13800138000', '13900139000', '13700137000'];

function canonicalCityName(province, city) {
  return ['市辖区', '县'].includes(city.name) &&
    ['北京市', '天津市', '上海市', '重庆市'].includes(province.name)
    ? province.name
    : city.name;
}

function collectStreetPaths(province) {
  const paths = [];
  for (const city of province.children || []) {
    for (const county of city.children || []) {
      for (const street of county.children || []) {
        paths.push({ province, city, county, street });
      }
    }
  }
  return paths;
}

function chooseTwo(paths) {
  if (paths.length < 2) return paths;
  return [
    paths[Math.floor(paths.length / 3)],
    paths[Math.floor((paths.length * 2) / 3)],
  ];
}

const records = [];
for (const [provinceIndex, province] of divisions.entries()) {
  const selectedPaths = chooseTwo(collectStreetPaths(province));
  for (const [pathIndex, selected] of selectedPaths.entries()) {
    const cityName = canonicalCityName(selected.province, selected.city);
    const detail = details[(provinceIndex + pathIndex) % details.length];
    const name = names[(provinceIndex * 2 + pathIndex) % names.length];
    const phone = phones[(provinceIndex + pathIndex) % phones.length];
    const prefix = `${selected.province.name}${
      cityName === selected.province.name ? '' : cityName
    }${selected.county.name}${selected.street.name}`;
    const cityPrefix = `${cityName}${selected.county.name}${selected.street.name}`;
    const countyPrefix = `${selected.county.name}${selected.street.name}`;
    const expected = {
      province: selected.province.name,
      city: cityName,
      county: selected.county.name,
      street: selected.street.name,
      detail,
      name,
      phone,
    };

    records.push(
      {
        id: `generated-${String(provinceIndex + 1).padStart(2, '0')}-${pathIndex + 1}-full`,
        category: 'full-path',
        input: `${prefix}${detail} ${name} ${phone}`,
        expected,
      },
      {
        id: `generated-${String(provinceIndex + 1).padStart(2, '0')}-${pathIndex + 1}-city`,
        category: 'missing-province',
        input: `${cityPrefix}${detail}，${name}，${phone}`,
        expected,
      },
      {
        id: `generated-${String(provinceIndex + 1).padStart(2, '0')}-${pathIndex + 1}-county`,
        category: 'missing-province-city',
        input: `${countyPrefix}${detail} ${name} ${phone}`,
        expected,
      },
    );
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`);
console.log(`Generated ${records.length} corpus cases at ${path.relative(root, outputPath)}`);
