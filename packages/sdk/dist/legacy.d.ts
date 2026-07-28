export interface LegacyResult {
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
