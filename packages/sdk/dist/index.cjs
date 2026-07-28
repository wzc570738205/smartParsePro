'use strict';
const divisions = require('./data/divisions.json');
const { createAddressParserEngine } = require('./engine.cjs');
module.exports = createAddressParserEngine(divisions);
