export type ParseWarning =
  | 'AMBIGUOUS_ADDRESS'
  | 'CANDIDATES_TRUNCATED'
  | 'INFERRED_ADMIN_LEVELS'
  | 'LOW_CONFIDENCE'
  | 'MULTIPLE_PHONES'

export interface DivisionResult {
  code: string
  name: string
  sourceName: string
  confidence: number
  matched: boolean
  inferred: boolean
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
