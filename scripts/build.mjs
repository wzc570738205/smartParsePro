import { createRequire } from 'node:module'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sdkDir = path.join(root, 'packages/sdk')
const distDir = path.join(sdkDir, 'dist')
const browserDir = path.join(distDir, 'browser')
const dataDir = path.join(distDir, 'data')
const enginePath = path.join(root, 'packages/core/src/engine.cjs')
const sourceDataPath = path.join(root, 'node/address-code.json')
const { createAddressParserEngine } = require(enginePath)

await mkdir(browserDir, { recursive: true })
await mkdir(dataDir, { recursive: true })
await cp(enginePath, path.join(distDir, 'engine.cjs'))
await cp(sourceDataPath, path.join(dataDir, 'divisions.json'))
await cp(path.join(root, 'README.md'), path.join(sdkDir, 'README.md'))

const rawData = await readFile(sourceDataPath, 'utf8')
JSON.parse(rawData)
const factorySource = createAddressParserEngine.toString()

const cjsEntry = `'use strict';
const divisions = require('./data/divisions.json');
const { createAddressParserEngine } = require('./engine.cjs');
module.exports = createAddressParserEngine(divisions);
`

const esmEntry = `import sdk from './index.cjs'
export const parseAddress = sdk.parseAddress
export const parseAddressBatch = sdk.parseAddressBatch
export const createParser = sdk.createParser
export const PARSER_VERSION = sdk.PARSER_VERSION
export const DATA_VERSION = sdk.DATA_VERSION
export default sdk
`

const legacyCjs = `'use strict';
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
`

const legacyEsm = `import legacy from './legacy.cjs'
export const smart = legacy.smart
export const address = legacy.address
export default legacy.smart
`

const browserEsm = `const divisions = ${rawData};
const createAddressParserEngine = ${factorySource};
const sdk = createAddressParserEngine(divisions);
export const parseAddress = sdk.parseAddress;
export const parseAddressBatch = sdk.parseAddressBatch;
export const createParser = sdk.createParser;
export const PARSER_VERSION = sdk.PARSER_VERSION;
export const DATA_VERSION = sdk.DATA_VERSION;
export default sdk;
`

const browserGlobal = `(function (root) {
  'use strict';
  var divisions = ${rawData};
  var createAddressParserEngine = ${factorySource};
  root.SmartParse = createAddressParserEngine(divisions);
})(typeof globalThis !== 'undefined' ? globalThis : window);
`

const dts = `export type ParseWarning =
  | 'AMBIGUOUS_ADDRESS'
  | 'CANDIDATES_TRUNCATED'
  | 'INFERRED_ADMIN_LEVELS'
  | 'LOW_CONFIDENCE'
  | 'MULTIPLE_PHONES'

export interface DivisionResult {
  code: string
  name: string
  confidence: number
  matched: boolean
  matchedText?: string
}

export interface ParseOptions {
  minConfidence?: number
  maxCandidates?: number
  includeInput?: boolean
  includeNormalizedInput?: boolean
  extractIdCard?: boolean
}

export interface ParseCandidateResult {
  candidateId: string
  rank: number
  name?: string
  phone?: string
  idCard?: string
  postalCode?: string
  province?: DivisionResult
  city?: DivisionResult
  county?: DivisionResult
  street?: DivisionResult
  detail?: string
  confidence: number
  scoreReasons: string[]
  warnings: ParseWarning[]
}

export interface BatchParseResult {
  index: number
  results: ParseCandidateResult[]
  warnings: ParseWarning[]
}

export interface CreateParserOptions {
  divisions?: unknown[]
  aliases?: Record<string, string[]>
  dataVersion?: string
}

export interface AddressParser {
  parseAddress(input: string, options?: ParseOptions): ParseCandidateResult[]
  parseAddress(
    input: string,
    customAddressData: unknown[],
    options?: ParseOptions & Pick<CreateParserOptions, 'aliases' | 'dataVersion'>
  ): ParseCandidateResult[]
  parseAddressBatch(inputs: readonly string[], options?: ParseOptions): BatchParseResult[]
  parseAddressBatch(
    inputs: readonly string[],
    customAddressData: unknown[],
    options?: ParseOptions & Pick<CreateParserOptions, 'aliases' | 'dataVersion'>
  ): BatchParseResult[]
  createParser(options?: CreateParserOptions): AddressParser
  readonly PARSER_VERSION: string
  readonly DATA_VERSION: string
}

export function parseAddress(input: string, options?: ParseOptions): ParseCandidateResult[]
export function parseAddress(
  input: string,
  customAddressData: unknown[],
  options?: ParseOptions & Pick<CreateParserOptions, 'aliases' | 'dataVersion'>
): ParseCandidateResult[]
export function parseAddressBatch(
  inputs: readonly string[],
  options?: ParseOptions
): BatchParseResult[]
export function parseAddressBatch(
  inputs: readonly string[],
  customAddressData: unknown[],
  options?: ParseOptions & Pick<CreateParserOptions, 'aliases' | 'dataVersion'>
): BatchParseResult[]
export function createParser(options?: CreateParserOptions): AddressParser
export const PARSER_VERSION: string
export const DATA_VERSION: string

declare const sdk: AddressParser
export default sdk
`

const legacyDts = `export interface LegacyResult {
  province?: string
  provinceCode?: string
  city?: string
  cityCode?: string
  county?: string
  countyCode?: string
  street?: string
  streetCode?: string
  address?: string
  name?: string
  phone?: string
  idCard?: string
  zipCode?: string
}
export const address: unknown[]
export function smart(input: unknown, customAddress?: unknown[]): LegacyResult
export default smart
`

await Promise.all([
  writeFile(path.join(distDir, 'index.cjs'), cjsEntry),
  writeFile(path.join(distDir, 'index.mjs'), esmEntry),
  writeFile(path.join(distDir, 'index.d.ts'), dts),
  writeFile(path.join(distDir, 'legacy.cjs'), legacyCjs),
  writeFile(path.join(distDir, 'legacy.mjs'), legacyEsm),
  writeFile(path.join(distDir, 'legacy.d.ts'), legacyDts),
  writeFile(path.join(browserDir, 'address-smart-parse.browser.mjs'), browserEsm),
  writeFile(path.join(browserDir, 'address-smart-parse.global.js'), browserGlobal),
])

console.log(`Built address-smart-parse v4 in ${path.relative(root, distDir)}`)
