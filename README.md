# smartParsePro V4

> 使用旧版？查看 [V3 源码与文档](https://github.com/wzc570738205/smartParsePro/releases/tag/3.1)。V3 已固定在 `V3` 标签；当前分支及本文档均为 V4。

<p align="center">
  <img src="https://github.com/user-attachments/assets/08e56c19-08c2-4f33-8d88-39e001b2305d" alt="smartParsePro logo" width="300">
</p>

<p align="center">离线中文地址解析：省、市、区县、乡镇街道、详细地址、姓名、电话、邮编和身份证</p>

<div align="center">
  <a href="https://www.npmjs.com/package/address-smart-parse">
    <img src="https://img.shields.io/npm/v/address-smart-parse.svg?color=blue&label=NPM" alt="npm version">
  </a>
  <a href="https://github.com/wzc570738205/smartParsePro">
    <img src="https://img.shields.io/github/stars/wzc570738205/smartParsePro?style=social" alt="GitHub Stars">
  </a>
</div>

## 状态说明

V4 源码已实现，支持：

- ESM `import`；
- CommonJS `require`；
- 浏览器 `<script>`；
- Browser ESM；
- Node.js HTTP API；
- npm CLI API Server；
- 自定义行政区划数据；
- V3 `smart()` 迁移入口。

V4 的核心变化是：`parseAddress()` **始终返回候选数组，不会默认选择第一条**。

V4 已正式发布到 npm：

```bash
npm install address-smart-parse@^4
```

- SDK：[address-smart-parse](https://www.npmjs.com/package/address-smart-parse)
- API Server：[address-smart-parse-server](https://www.npmjs.com/package/address-smart-parse-server)

## 为什么返回数组

中国行政区划中存在大量同名区县和乡镇。例如只输入：

```text
鼓楼区中山北路1号
```

可能对应南京、徐州、福州或开封。V4 返回全部达到质量门槛的合法路径：

```js
const results = parseAddress('鼓楼区中山北路1号')

console.log(results.length) // 4
```

候选按照评分从高到低排序，但：

- `rank: 1` 只表示当前评分最高；
- 不代表系统已经确认第一条；
- 结果中没有 `selected` 字段；
- 调用方可以结合用户位置、邮编、历史订单或人工选择继续消歧。

唯一结果返回单元素数组，没有行政区划匹配时返回空数组。

## 运行环境

- Node.js 22 或更高版本；
- 现代浏览器；
- 解析核心离线运行，不会上传地址；
- 当前实现没有运行时第三方依赖。

检查环境：

```bash
node --version
npm --version
```

## 从当前仓库开始

```bash
git clone https://github.com/wzc570738205/smartParsePro.git
cd smartParsePro
npm install
npm run build
npm test
```

完整构建和测试：

```bash
npm run test:v4
```

运行 CommonJS 示例：

```bash
node examples/v4.cjs
```

运行 ESM 示例：

```bash
node examples/v4.mjs
```

## npm 安装

```bash
npm install address-smart-parse@^4
```

当前仓库内使用 npm workspaces，执行一次 `npm install` 后，可以直接通过包名测试：

```js
const { parseAddress } = require('address-smart-parse')
```

## ESM 使用

```js
import { parseAddress } from 'address-smart-parse'

const results = parseAddress(
  '陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918'
)

for (const candidate of results) {
  console.log(candidate.province?.name)
  console.log(candidate.city?.name)
  console.log(candidate.county?.name)
  console.log(candidate.street?.name)
  console.log(candidate.detail)
}
```

## CommonJS 使用

```js
const { parseAddress } = require('address-smart-parse')

const results = parseAddress(
  '广东省珠海市香洲区盘山路28号幸福茶庄,陈景勇，13593464918'
)

console.dir(results, { depth: null })
```

## 返回结构

输入：

```text
浙江省金华市婺城区西关街道金磐路15180231234 李节霁
```

简化后的结果：

```json
[
  {
    "candidateId": "asp-hp951c",
    "rank": 1,
    "name": "李节霁",
    "phone": "15180231234",
    "detail": "金磐路",
    "confidence": 0.99,
    "scoreReasons": [
      "FULL_PROVINCE_MATCH",
      "FULL_CITY_MATCH",
      "FULL_COUNTY_MATCH",
      "FULL_STREET_MATCH",
      "ORDERED_LEVELS",
      "ADJACENT_LEVELS",
      "STRONG_HIERARCHY"
    ],
    "warnings": [],
    "province": {
      "code": "33",
      "name": "浙江省",
      "sourceName": "浙江省",
      "confidence": 0.99,
      "matched": true,
      "inferred": false,
      "matchedText": "浙江省"
    },
    "city": {
      "code": "3307",
      "name": "金华市",
      "sourceName": "金华市",
      "confidence": 0.99,
      "matched": true,
      "inferred": false,
      "matchedText": "金华市"
    },
    "county": {
      "code": "330702",
      "name": "婺城区",
      "sourceName": "婺城区",
      "confidence": 0.99,
      "matched": true,
      "inferred": false,
      "matchedText": "婺城区"
    },
    "street": {
      "code": "330702007",
      "name": "西关街道",
      "sourceName": "西关街道",
      "confidence": 0.99,
      "matched": true,
      "inferred": false,
      "matchedText": "西关街道"
    }
  }
]
```

### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `candidateId` | `string` | 根据行政路径生成的稳定候选 ID |
| `rank` | `number` | 当前候选排序，从 1 开始 |
| `province` | `DivisionResult` | 省级结果 |
| `city` | `DivisionResult` | 市级结果 |
| `county` | `DivisionResult` | 区县结果 |
| `street` | `DivisionResult` | 乡镇、街道结果 |
| `detail` | `string` | 去除行政区划和已提取实体后的详细地址 |
| `name` | `string` | 姓名 |
| `phone` | `string` | 规范化后的电话 |
| `postalCode` | `string` | 六位邮编 |
| `idCard` | `string` | 通过校验位验证的身份证 |
| `confidence` | `number` | 候选相对置信度，范围 0～1 |
| `scoreReasons` | `string[]` | 评分依据 |
| `warnings` | `string[]` | 歧义、推断、截断等警告 |

`confidence` 是规则评分结果，用于候选排序和过滤，不应当作统计意义上的真实概率。

### 行政区划字段

```ts
interface DivisionResult {
  code: string
  name: string
  sourceName: string
  confidence: number
  matched: boolean
  inferred: boolean
  matchedText?: string
}
```

`sourceName` 保留行政区划数据中的原始名称；`matched: false` 和 `inferred: true`
表示该层级由父子行政路径推断，而不是在原文中直接出现。

### 直辖市

北京、天津、上海和重庆在业务输出中保持完整的省、市、区三级结构。以北京为例：

```js
const [result] = parseAddress('北京市东城区东华门街道111号')

result.province.name    // 北京市
result.city.name        // 北京市
result.city.sourceName  // 市辖区
result.city.matched     // false
result.city.inferred    // true
```

解析器不会修改调用方传入的行政区划数据。一个“北京市”文本区间只作为一个
行政层级的显式证据；若原文只有一个“北京市”，市级结果通过行政路径推断。

### 警告类型

| 警告 | 含义 |
| --- | --- |
| `AMBIGUOUS_ADDRESS` | 存在多个合法行政路径 |
| `CANDIDATES_TRUNCATED` | 候选数超过 `maxCandidates` |
| `INFERRED_ADMIN_LEVELS` | 部分省市层级来自路径推断 |
| `LOW_CONFIDENCE` | 当前候选证据较弱 |
| `MULTIPLE_PHONES` | 输入中发现多个电话号码 |

## 解析选项

```js
const results = parseAddress(input, {
  minConfidence: 0.3,
  maxCandidates: 10,
  extractIdCard: false
})
```

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `minConfidence` | `0.18` | 过滤低于此分数的候选，范围 0～1 |
| `maxCandidates` | `20` | 最大返回候选数，范围 1～100 |
| `extractIdCard` | `true` | 是否在结果中输出身份证 |

即使设置 `maxCandidates: 1`，V4 也不会声明该结果已经被确认；它只限制返回数量。

## 自定义行政区划数据

### V3 风格：作为第二参数

```js
import { parseAddress } from 'address-smart-parse'
import customAddressData from './custom-streets.json'

const results = parseAddress(
  '测试省示例市未来区星河街道创新路1号',
  customAddressData
)
```

第三个参数可以继续传解析选项：

```js
const results = parseAddress(input, customAddressData, {
  minConfidence: 0.3,
  maxCandidates: 20,
  dataVersion: 'company-2026-07'
})
```

第二个参数的判断规则：

- 数组：自定义行政区划数据；
- 普通对象：解析选项。

这种写法每次调用都会创建自定义索引，适合偶发调用。

### 推荐方式：复用自定义解析器

高频或批量调用应使用 `createParser()`，避免重复创建索引：

```js
import { createParser } from 'address-smart-parse'
import customAddressData from './custom-streets.json'

const parser = createParser({
  divisions: customAddressData,
  dataVersion: 'company-2026-07',
  aliases: {
    "990000": ["测试", "测试地区"]
  }
})

const first = parser.parseAddress(address1)
const second = parser.parseAddress(address2)
```

### 自定义数据格式

数据结构与常见的 `streets.json` 省市区街道树一致：

```json
[
  {
    "code": "99",
    "name": "测试省",
    "children": [
      {
        "code": "9901",
        "name": "示例市",
        "children": [
          {
            "code": "990101",
            "name": "未来区",
            "children": [
              {
                "code": "990101001",
                "name": "星河街道"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

要求：

- 层级顺序为省、市、区县、乡镇街道；
- 每个节点必须包含唯一 `code` 和非空 `name`；
- 子级放在 `children` 数组；
- 同名节点依靠父子路径消歧；
- 自定义简称通过 `aliases` 配置，不建议直接复制节点。

## 批量解析

```js
import { parseAddressBatch } from 'address-smart-parse'

const batch = parseAddressBatch([
  '北京市朝阳区望京街道阜通东大街6号',
  '鼓楼区中山北路1号',
  '雁塔区丈八沟街道高新四路710061 刘国良'
])

for (const item of batch) {
  console.log(item.index)
  console.log(item.results)
}
```

返回：

```ts
interface BatchParseResult {
  index: number
  results: ParseCandidateResult[]
  warnings: string[]
}
```

批量解析也支持自定义数据：

```js
const batch = parseAddressBatch(inputs, customAddressData, {
  maxCandidates: 10
})
```

## 浏览器 Script

先构建：

```bash
npm run build
```

本地页面：

```html
<script src="./packages/sdk/dist/browser/address-smart-parse.global.js"></script>
<script>
  const results = SmartParse.parseAddress(
    '广东省珠海市香洲区盘山路28号 陈景勇 13593464918'
  )
  console.log(results)
</script>
```

仓库内提供测试页面：

```text
demo/v4.html
```

通过 CDN 使用：

```html
<script src="https://cdn.jsdelivr.net/npm/address-smart-parse@4/dist/browser/address-smart-parse.global.js"></script>
```

浏览器全局变量为 `SmartParse`，不会创建 `window.smart`。

## Browser ESM

```html
<script type="module">
  import {
    parseAddress
  } from './packages/sdk/dist/browser/address-smart-parse.browser.mjs'

  const results = parseAddress('浙江省杭州市西湖区文三路90号')
  console.log(results)
</script>
```

## HTTP API

### 启动服务

从当前仓库启动：

```bash
npm run start:api
```

默认监听：

```text
http://127.0.0.1:1399
```

指定地址和端口：

```bash
node packages/server/bin/smart-parse-server.cjs \
  --host 0.0.0.0 \
  --port 1399
```

通过 npm 直接启动：

```bash
npx address-smart-parse-server@4 --host 0.0.0.0 --port 1399
```

### 接口列表

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/v1/parse` | 单条解析 |
| `POST` | `/v1/parse/batch` | 批量解析 |
| `GET` | `/healthz` | 存活检查 |
| `GET` | `/readyz` | 就绪和版本检查 |
| `GET` | `/version` | 版本信息 |

`/v1/parse` 是 POST 接口，不能直接在浏览器地址栏中测试。地址栏应访问：

```text
http://127.0.0.1:1399/healthz
```

### 单条接口

```bash
curl -X POST http://127.0.0.1:1399/v1/parse \
  -H 'content-type: application/json' \
  -d '{
    "text": "鼓楼区中山北路1号 王五 13900000000",
    "options": {
      "minConfidence": 0.2,
      "maxCandidates": 10
    }
  }'
```

响应结构：

```json
{
  "requestId": "uuid",
  "data": {
    "parserVersion": "4.0.2",
    "dataVersion": "legacy-address-code-v1",
    "results": [],
    "warnings": ["NO_MATCH"]
  }
}
```

`data.results` 始终是数组。无匹配时为 `[]`，同时返回 `NO_MATCH`。

### 批量接口

```bash
curl -X POST http://127.0.0.1:1399/v1/parse/batch \
  -H 'content-type: application/json' \
  -d '{
    "items": [
      {
        "id": "order-1",
        "text": "北京市朝阳区望京街道阜通东大街6号"
      },
      {
        "id": "order-2",
        "text": "鼓楼区中山北路1号"
      }
    ],
    "options": {
      "maxCandidates": 10
    }
  }'
```

批量接口逐项返回结果或错误，一条非法数据不会导致整个批次失败。

### 作为 Node.js 模块嵌入

```js
import { createSmartParseServer } from 'address-smart-parse-server'

const server = createSmartParseServer({
  host: '0.0.0.0',
  port: 1399,
  bodyLimit: 256 * 1024,
  batchLimit: 100,
  textLimit: 2000,
  allowedOrigins: ['https://example.com']
})

await server.start()
```

使用自定义解析器：

```js
import { createParser } from 'address-smart-parse'
import { createSmartParseServer } from 'address-smart-parse-server'

const parser = createParser({
  divisions: customAddressData,
  dataVersion: 'company-2026-07'
})

const server = createSmartParseServer({
  parser,
  host: '0.0.0.0',
  port: 1399
})

await server.start()
```

### API 限制

默认值：

- 请求体上限：256 KiB；
- 单条文本上限：2,000 字符；
- 批量上限：100 条；
- `maxCandidates` 最大值：100；
- CORS 默认不允许任意来源；
- 默认日志不输出地址、电话和身份证。

### HTTP 状态码

| 状态码 | 含义 |
| --- | --- |
| `200` | 请求处理完成 |
| `400` | JSON 或参数错误 |
| `404` | 路由不存在 |
| `413` | 请求体、文本或批量超过限制 |
| `415` | Content-Type 不是 `application/json` |
| `500` | 未预期服务端错误 |

## Docker

在仓库根目录执行：

```bash
docker build \
  -f packages/server/Dockerfile \
  -t address-smart-parse-server:4 .

docker run --rm \
  -p 1399:1399 \
  address-smart-parse-server:4
```

健康检查：

```bash
curl http://127.0.0.1:1399/healthz
```

## V3 迁移

V4 根入口不再导出 `smart()`。旧代码：

```js
import { smart, address } from 'address-smart-parse'
const result = smart(input, address)
```

迁移期间可以显式使用 legacy 子路径：

```js
import { smart, address } from 'address-smart-parse/legacy'
const result = smart(input, address)
```

legacy 仍然返回单对象，只用于迁移。新代码应改为：

```js
import { parseAddress } from 'address-smart-parse'
const results = parseAddress(input)
```

常见字段映射：

| V3 | V4 |
| --- | --- |
| `address` | `detail` |
| `zipCode` | `postalCode` |
| `province` 字符串 | `province.name` |
| `provinceCode` | `province.code` |
| `street` 字符串 | `street.name` |
| 单对象 | 候选数组 |

## 支持的输入形式

```text
广东省珠海市香洲区盘山路28号幸福茶庄,陈景勇，13593464918

马云，陕西省西安市雁塔区丈八沟街道高新四路高新大都荟 13593464918

雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918

收货人: 李节霁手机号码: 15180231234所在地区: 浙江省金华市婺城区西关街道详细地址: 金磐路上坞街

新疆阿克苏温宿县博孜墩柯尔克孜族乡吾斯塘博村一组306号 150-3569-6956 马云
```

V4 会规范化：

- 全角字符；
- 中文和英文标点；
- 电话空格和横杠；
- 标签粘连；
- 邮编与详情粘连；
- 缺省、缺市等不完整行政路径。

## 测试与语料

运行全部测试：

```bash
npm run test:v4
```

生成全国组合测试集：

```bash
npm run generate:corpus
```

运行语料评估：

```bash
npm run build
npm run evaluate:corpus
```

当前测试集：

- 7 条人工标注回归地址；
- 186 条覆盖 31 个省级区域的确定性生成地址；
- 生成集包含完整路径、缺省、缺省市三类；
- 17 项自动化测试。

语料文件：

- `tests/fixtures/v4-regression.json`
- `tests/fixtures/v4-generated.json`

确定性生成数据适合验证行政层级和工程回归，不能替代真实业务准确率评估。评估真实识别率应使用独立、脱敏、人工标注的业务地址。

## 构建产物

```text
packages/sdk/dist/
  index.mjs
  index.cjs
  index.d.ts
  legacy.mjs
  legacy.cjs
  legacy.d.ts
  engine.cjs
  data/
    divisions.json
  browser/
    address-smart-parse.browser.mjs
    address-smart-parse.global.js
```

检查 npm 发布内容：

```bash
npm pack --dry-run ./packages/sdk
npm pack --dry-run ./packages/server
```

## 项目结构

```text
packages/
  core/       # 无运行环境依赖的解析核心
  sdk/        # address-smart-parse npm 包
  server/     # address-smart-parse-server
scripts/
  build.mjs
  generate-corpus.cjs
  evaluate-corpus.cjs
tests/
  fixtures/
  browser.test.cjs
  corpus.test.cjs
  parser.test.cjs
  server.test.cjs
demo/
  v4.html
examples/
  v4.cjs
  v4.mjs
```

## 性能

当前仓库的一次本机抽样结果：

- 初始化约 60ms；
- 预热后单条解析约 0.1～0.2ms；
- SDK npm 压缩包约 1.1MB。

性能会受硬件、Node.js 版本、输入长度、自定义数据规模和候选数量影响。正式发布应在固定环境中报告 p50、p95 和 p99。

## 数据来源

- 行政区划数据：[Administrative-divisions-of-China](https://github.com/modood/Administrative-divisions-of-China)
- 邮编参考数据：[china-city-area-zip-data](https://github.com/xieranmaya/china-city-area-zip-data)

行政区划会发生变化。发布生产系统前，应确认数据版本、撤县设区、行政更名和历史别名。

## 相关项目

- [Python 版本](https://github.com/wzc570738205/smartParsePro-py)
- [Hugging Face 演示](https://huggingface.co/spaces/wzc2334234/address)

## 常见问题

### 浏览器显示 `ERR_CONNECTION_REFUSED`

API 服务尚未启动。执行：

```bash
npm run start:api
```

然后访问：

```text
http://127.0.0.1:1399/healthz
```

### 浏览器打开 `/v1/parse` 显示 404

`/v1/parse` 只接受 POST，不能直接通过地址栏 GET 请求。请使用 curl、Postman、前端 `fetch()` 或 `demo/v4.html`。

### 为什么短地址返回很多候选

输入缺少足够的省市信息。可以：

- 展示候选让用户选择；
- 使用用户定位或历史订单二次排序；
- 提高 `minConfidence`；
- 减小 `maxCandidates`；
- 传入企业自己的地址数据和别名。

### 为什么不直接返回 `results[0]`

同名行政区普遍存在，直接取第一条会把不确定结果伪装成确定结果。V4 将最终选择权交给调用方。

### 自定义数据为什么推荐 `createParser`

`parseAddress(input, customAddressData)` 每次都会重新创建索引。`createParser()` 可以复用索引，适合批量和服务端请求。

## 商用与许可证

V4 npm 包声明为 ISC License，详见 [`packages/sdk/LICENSE`](./packages/sdk/LICENSE)。如果商业项目还涉及历史版本、品牌展示、私有部署支持或单独服务协议，请联系项目作者确认。

## 联系作者
<img width="200"  alt="48281df46ef960ad7049182ffab2a3d2" src="https://github.com/user-attachments/assets/3a10035e-e2b6-4168-af6c-b3d1d1ffa1ac" />

