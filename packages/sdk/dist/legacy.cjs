'use strict';
const sdk = require('./index.cjs');
const address = require('./data/divisions.json');

function toLegacy(candidate) {
  if (!candidate) return {};
  return {
    province: candidate.province && candidate.province.name,
    provinceCode: candidate.province && candidate.province.code,
    city: candidate.city && candidate.city.name,
    cityCode: candidate.city && candidate.city.code,
    county: candidate.county && candidate.county.name,
    countyCode: candidate.county && candidate.county.code,
    street: candidate.street && candidate.street.name,
    streetCode: candidate.street && candidate.street.code,
    address: candidate.detail,
    name: candidate.name,
    phone: candidate.phone,
    idCard: candidate.idCard,
    zipCode: candidate.postalCode
  };
}

function smart(input, customAddress) {
  const parser = customAddress ? sdk.createParser({ divisions: customAddress }) : sdk;
  return toLegacy(parser.parseAddress(String(input))[0]);
}

module.exports = { smart, address };
