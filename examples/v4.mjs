import { parseAddress } from 'address-smart-parse'

const input = '北京市朝阳区望京街道阜通东大街6号 张三 13800138000'
const results = parseAddress(input)

console.dir(results, { depth: null })
