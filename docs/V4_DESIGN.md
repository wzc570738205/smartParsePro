# smartParsePro V4 设计方案

> 状态：Proposal  
> 目标版本：4.0.0（现有 npm latest 为 3.0.3）  
> 主 npm 包：`address-smart-parse`  
> API Server 包：`address-smart-parse-server`

## 1. 目标

V4 将当前浏览器端与 Node 端的两套解析代码合并为一套无状态解析核心，并提供四种正式交付方式：

1. npm ESM：支持 `import`；
2. npm CommonJS：支持 `require`；
3. 浏览器 Script：支持 CDN 或本地 `<script>` 直接引入；
4. API Server：支持 npm CLI、Node 模块和 Docker 部署。

所有交付方式必须使用同一份解析核心、同一份行政区划数据和同一套测试用例，保证相同输入、相同配置得到相同结果。

### 1.1 V4 成功标准

- 不再维护浏览器版和 Node 版两套匹配逻辑；
- 支持省、市、区县、乡镇街道、详细地址、姓名、电话、身份证、邮编提取；
- 对缺省、缺市、缺区县、乱序、带标签、无分隔符等输入生成候选并进行层级消歧；
- 对“鼓楼区”等重名地址返回置信度、歧义警告和候选路径，不再静默选择数据中的第一个；
- npm 包包含完整 TypeScript 类型；
- ESM、CJS、浏览器 Script、API 四类消费方式都有独立的自动化冒烟测试；
- `parseAddress(input, options?)` 始终返回候选数组，不隐式选中一个结果。

### 1.2 非目标

- V4.0 不把在线大模型或远程服务作为解析前提；
- V4.0 不把机器学习模型放入核心包；
- 不承诺仅凭一个重名区县就能唯一确定城市；
- 不在解析核心中包含 HTTP、日志、文件系统或全局 `window` 操作。

## 2. 总体架构

```text
                            +-----------------------+
                            |  行政区划数据构建脚本  |
                            +-----------+-----------+
                                        |
                                版本化紧凑索引
                                        |
+-------------+   +---------------------v----------------------+
| 输入文本     |-->| normalize -> extract -> candidates         |
+-------------+   |           -> score -> assemble             |
                  |              @ V4 Parser Core               |
                  +-----+---------------+---------------+-------+
                        |               |               |
                 ESM / CJS SDK     Browser Global   API Server
                 import / require      <script>      CLI / Docker
```

解析核心保持同步、纯函数化和无 I/O。API Server 只负责 HTTP 协议、限流、校验、日志和进程生命周期。

## 3. Monorepo 结构

```text
smartParsePro/
  package.json                 # workspace、统一脚本和开发工具
  pnpm-workspace.yaml
  tsconfig.base.json
  packages/
    core/                      # 不感知运行环境的解析核心
      src/
        parser.ts
        normalize/
        extractors/
        candidates/
        scoring/
        result/
        types.ts
    data-cn/                   # 行政区划源数据、别名和生成产物
      raw/
      aliases/
      generated/
      scripts/
    sdk/                       # 发布为 address-smart-parse
      src/
      dist/
      package.json
    server/                    # 发布为 address-smart-parse-server
      src/
      bin/
      Dockerfile
      package.json
  tests/
    corpus/                    # 脱敏黄金语料
    compatibility/
    performance/
    fixtures/
  docs/
    V4_DESIGN.md
    MIGRATION_V3_TO_V4.md
    DATA_FORMAT.md
    API.md
```

`core` 与 `data-cn` 可以先作为 workspace 内部包。首个正式版本只发布 SDK 和 Server 两个用户可见的 npm 包，减少用户选择成本。

## 4. 解析核心

### 4.1 标准处理流水线

```text
原始输入
  -> 输入校验
  -> Unicode 与标点标准化
  -> 带原文 offset 的确定性实体提取
  -> 全文行政区划候选生成
  -> 行政层级路径组合
  -> 候选评分与冲突消解
  -> 姓名、详细地址、备注划分
  -> 结果校验与置信度计算
```

流水线每一步返回新对象，不修改调用方输入和全局数据。解析器实例构造完成后只读，因此可以安全复用。

### 4.2 文本标准化

标准化模块负责：

- 全角数字、字母和常见标点转半角；
- 统一空白符、破折号和电话号码分隔符；
- 识别“收件人、联系人、手机、地址、邮编”等标签；
- 清理展示噪声，但不直接删除有语义的字符；
- 保存 `normalized offset -> original offset` 映射。

保留 offset 映射后，实体删除、剩余地址拼装以及前端高亮都可以基于原文完成，避免连续 `replace()` 误删相同文本。

### 4.3 确定性实体提取

正则仅用于边界明确的实体：

- 中国大陆手机号及可配置的国家码；
- 座机和分机；
- 18 位身份证及校验位验证；
- 6 位邮编，并与行政区划候选交叉验证；
- 显式标签后的姓名、电话和地址片段；
- 门牌号、楼栋、单元、楼层、房间号等详细地址特征。

每个提取器返回统一的 span：

```ts
interface EntitySpan<T = string> {
  type: 'phone' | 'idCard' | 'postalCode' | 'label' | 'addressFeature'
  value: T
  raw: string
  start: number
  end: number
  confidence: number
  source: string
}
```

### 4.4 行政区划索引

构建阶段将源数据转换为不可变索引：

- `code -> DivisionNode`；
- `parentCode -> childrenCodes`；
- `canonicalName/alias -> codes[]`；
- 名称 Trie 或 Aho-Corasick 自动机；
- 邮编与行政编码的反向索引；
- 紧凑字符串表和整数数组，供浏览器包复用。

别名作为数据维护，不写死在解析代码中。例如：

```json
{
  "110000": ["北京", "北京市"],
  "650000": ["新疆", "新疆维吾尔自治区"],
  "152900": ["阿拉善", "阿拉善盟"]
}
```

源数据和生成产物必须包含独立版本：

```ts
interface DivisionDataMeta {
  schemaVersion: 1
  dataVersion: string
  source: string
  generatedAt: string
  checksum: string
}
```

### 4.5 候选生成

V4 扫描整段标准化文本，而不是只截取地址开头。每个命中的行政区划名称形成候选：

```ts
interface DivisionCandidate {
  code: string
  level: 'province' | 'city' | 'county' | 'street'
  canonicalName: string
  matchedText: string
  start: number
  end: number
  exact: boolean
  alias: boolean
  path: string[]
}
```

随后根据父子关系组成合法路径。非法的跨省、跨市组合直接丢弃，不再通过遍历顺序决定结果。

### 4.6 候选评分

第一版采用可解释的加权评分，权重集中配置并通过黄金语料校准：

```text
路径分 =
  完整名称命中
  + 显式行政后缀
  + 省市区街道父子关系完整
  + 各级名称在文本中顺序合理
  + 相邻层级距离较近
  + 邮编或行政编码一致
  + 详细地址特征位于行政区划之后
  - 跨层级冲突
  - 同名歧义
  - 过短别名误命中
  - 候选位置重叠冲突
```

评分器输出所有达到最低质量门槛的合法路径，并按置信度从高到低排序。置信度不能只是原始加权分，需要经测试集标定到 `0..1`。

候选输出遵循以下硬规则：

- 唯一合法结果返回单元素数组；
- 多个合法结果返回多元素数组；
- 无合法结果返回空数组；
- 排名第一只表示得分最高，不表示系统替调用方确认；
- 不提供 `best-effort` 或“只取第一条”的默认行为；
- 可通过 `minConfidence` 过滤低质量候选；
- 可通过 `maxCandidates` 限制响应规模，发生截断时必须返回 `CANDIDATES_TRUNCATED` 警告。

### 4.7 姓名和详细地址

姓名候选优先级：

1. “收件人/联系人/姓名”标签后的文本；
2. 电话前后由分隔符隔开的短文本；
3. 排除行政区划、道路、公司、门店、楼栋等词后的 2～4 字候选；
4. 无法可靠判断时保留到 `unknownSegments`，不强行输出姓名。

详细地址由未被消费的原文 span 组装，并保留道路、门牌、楼栋和房间信息。V4 不再通过反复 `String.replace()` 生成详细地址。

### 4.8 可插拔扩展

核心提供扩展点，但默认包不依赖模型：

```ts
interface ParserPlugin {
  name: string
  beforeNormalize?(context: ParseContext): void
  extract?(context: ParseContext): EntitySpan[]
  score?(path: CandidatePath, context: ParseContext): number
  afterParse?(results: ParseCandidateResult[], context: ParseContext): ParseCandidateResult[]
}
```

以后可单独提供 OCR 纠错、企业内部地址词典或 NER 插件，不影响基础包体积和离线能力。

### 4.9 V4 兼容与迁移约束

现有 npm 包已经发布到 3.0.3。由于主返回值从单对象改为候选数组，本方案作为破坏性版本发布为 4.0.0：

- 主入口不再导出旧版 `smart` 和可变的 `address` 数据；
- 主入口提供 `parseAddress`、`parseAddressBatch` 和 `createParser`；
- `parseAddress` 永远返回数组，不能提供“自动取第一条”的配置；
- 老用户如需短期迁移，可显式使用 `address-smart-parse/legacy`；
- legacy 入口在 V4 生命周期内只修复安全和严重正确性问题，不增加新功能；
- ESM、CJS、Browser 和 Server 全部遵循数组结果契约。

## 5. SDK 公共 API

### 5.1 推荐 API

```ts
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
  scoreReasons: ScoreReason[]
  unknownSegments?: string[]
  warnings: ParseWarning[]
}

export interface BatchParseResult {
  index: number
  results: ParseCandidateResult[]
  warnings: ParseWarning[]
}

export function parseAddress(
  input: string,
  options?: ParseOptions
): ParseCandidateResult[]

export function parseAddressBatch(
  inputs: readonly string[],
  options?: ParseOptions
): BatchParseResult[]

export function createParser(options?: CreateParserOptions): AddressParser

export const PARSER_VERSION: string
export const DATA_VERSION: string
```

`createParser()` 用于传入自定义行政数据、别名和插件；普通用户直接使用预构建的默认解析器。

### 5.2 ESM

```js
import { parseAddress, createParser } from 'address-smart-parse'

const results = parseAddress(
  '浙江省金华市婺城区西关街道金磐路15180231234 李节霁'
)

for (const candidate of results) {
  console.log(candidate.province, candidate.city, candidate.confidence)
}
```

### 5.3 CommonJS

```js
const { parseAddress, createParser } = require('address-smart-parse')

const results = parseAddress('北京市朝阳区望京街道阜通东大街6号')
```

### 5.4 自定义数据

```js
import { createParser } from 'address-smart-parse'

const parser = createParser({
  divisions: customDivisionData,
  aliases: customAliases
})

const results = parser.parse('园区内部地址文本')
```

自定义数据必须经过 schema 校验。错误数据在构造解析器时抛错，不允许在解析过程中静默忽略。

### 5.5 V3 兼容入口

```js
import { smart, address } from 'address-smart-parse/legacy'

const legacyResult = smart(input, address)
```

V4 根入口不再导出 `smart`。旧调用方需要显式修改 import 路径到 `/legacy`，避免误以为旧版单对象结果符合 V4 多候选契约。

兼容层把 V4 排名第一的候选映射成 V3 字段，仅用于旧系统迁移：

```ts
{
  province: string,
  provinceCode: string,
  city: string,
  cityCode: string,
  county: string,
  countyCode: string,
  street: string,
  streetCode: string,
  address: string,
  name: string,
  phone: string,
  idCard: string,
  zipCode: string
}
```

兼容层仍会产生单对象，这是有意保留的旧行为；V4 主 API、Browser 主构建和 HTTP API 均不会调用该兼容层。

## 6. npm 发布设计

### 6.1 `address-smart-parse`

构建产物：

```text
dist/
  index.mjs                             # ESM
  index.cjs                             # CommonJS
  index.d.ts                            # 类型
  legacy.mjs
  legacy.cjs
  legacy.d.ts
  browser/
    address-smart-parse.global.js       # IIFE，window.SmartParse
    address-smart-parse.browser.mjs     # Browser ESM
  data/
    divisions.json
```

建议的 `package.json` 关键字段：

```json
{
  "name": "address-smart-parse",
  "version": "4.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "default": "./dist/index.mjs"
    },
    "./legacy": {
      "types": "./dist/legacy.d.ts",
      "import": "./dist/legacy.mjs",
      "require": "./dist/legacy.cjs"
    },
    "./browser": {
      "types": "./dist/index.d.ts",
      "import": "./dist/browser/address-smart-parse.browser.mjs",
      "default": "./dist/browser/address-smart-parse.browser.mjs"
    },
    "./browser/global": "./dist/browser/address-smart-parse.global.js",
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "engines": {
    "node": ">=22"
  }
}
```

`exports` 的条件顺序固定为 `types -> import -> require -> default`。ESM 与 CJS 必须由同一 TypeScript 源码构建，且不能各自创建行为不同的全局单例。

Node.js 22 和 24 是方案制定时仍受支持的 LTS 版本，因此 V4 将 Node.js 22 作为最低服务端版本。浏览器构建不继承这个运行时限制。

### 6.2 发布前验证

每次发布必须执行：

```text
类型检查
-> 单元/语料/性能测试
-> ESM import 冒烟测试
-> CommonJS require 冒烟测试
-> 浏览器 Script 冒烟测试
-> npm pack 内容检查
-> 从生成的 tgz 安装并再次测试
-> API Server 与 Docker 冒烟测试
-> 发布 canary tag
-> 验证后发布 latest
```

禁止从未构建的工作区直接发布；CI 发布时校验 Git tag、包版本、解析器版本与数据版本一致。

## 7. 浏览器 Script 交付

### 7.1 CDN 引入

```html
<script src="https://cdn.jsdelivr.net/npm/address-smart-parse@4/dist/browser/address-smart-parse.global.js"></script>
<script>
  const results = SmartParse.parseAddress(
    '广东省珠海市香洲区盘山路28号 陈景勇 13593464918'
  )
  console.log(results)
</script>
```

也可下载同一个文件后本地部署。全局变量固定为 `window.SmartParse`，不默认污染 `window.smart`。`SmartParse.parseAddress()` 与 npm 主入口一样始终返回数组。V3 Script 页面需要改用新的数组契约；单对象兼容层只提供 npm ESM/CJS 入口。

### 7.2 Browser ESM

```html
<script type="module">
  import { parseAddress } from 'https://cdn.jsdelivr.net/npm/address-smart-parse@4/dist/browser/address-smart-parse.browser.mjs'
  console.log(parseAddress('浙江省杭州市西湖区文三路90号'))
</script>
```

### 7.3 包体策略

V4.0 先提供开箱即用的完整包。构建报告必须分别记录：

- JS 逻辑体积；
- 行政区划数据体积；
- 压缩前体积；
- gzip 与 brotli 体积；
- 浏览器初始化耗时；
- 首次解析与预热后解析耗时。

如果完整街道数据超过最终确定的体积预算，再追加 `standard` 与 `full` 两档浏览器构建，但两档使用同一解析 API。

## 8. API Server

### 8.1 三种部署方式

通过 npm CLI：

```bash
npm install -g address-smart-parse-server
smart-parse-server --host 0.0.0.0 --port 1399
```

通过 `npx`：

```bash
npx address-smart-parse-server --port 1399
```

作为 Node 模块嵌入：

```js
import { createSmartParseServer } from 'address-smart-parse-server'

const server = await createSmartParseServer({
  host: '0.0.0.0',
  port: 1399,
  bodyLimit: 256 * 1024,
  batchLimit: 100
})

await server.start()
```

Docker：

```bash
docker build -f packages/server/Dockerfile -t address-smart-parse-server:4 .
docker run --rm -p 1399:1399 address-smart-parse-server:4
```

正式镜像的 registry、组织名和签名策略在发布前冻结；在此之前文档只承诺仓库内 Dockerfile 可构建，不虚构尚未发布的公共镜像地址。

### 8.2 HTTP 接口

```text
POST /v1/parse
POST /v1/parse/batch
GET  /healthz
GET  /readyz
GET  /version
```

单条请求：

```json
{
  "text": "浙江省金华市婺城区西关街道金磐路15180231234 李节霁",
  "options": {
    "minConfidence": 0.3,
    "maxCandidates": 10
  }
}
```

成功响应：

```json
{
  "requestId": "01...",
  "data": {
    "parserVersion": "4.0.0",
    "dataVersion": "2026.07",
    "results": [
      {
        "candidateId": "candidate-1",
        "rank": 1,
        "name": "李节霁",
        "phone": "15180231234",
        "province": { "code": "33", "name": "浙江省", "confidence": 0.99 },
        "city": { "code": "3307", "name": "金华市", "confidence": 0.99 },
        "county": { "code": "330702", "name": "婺城区", "confidence": 0.99 },
        "street": { "code": "330702007", "name": "西关街道", "confidence": 0.98 },
        "detail": "金磐路",
        "confidence": 0.98,
        "scoreReasons": ["EXACT_HIERARCHY", "ORDERED_LEVELS"],
        "warnings": []
      }
    ],
    "warnings": []
  }
}
```

HTTP API 的 `data.results` 永远是数组。对于“鼓楼区中山北路 1 号”这类无法唯一确定城市的输入，数组中可以同时返回南京、徐州或其他达到门槛的合法路径。服务端只排序，不增加 `selected` 字段，也不把 `results[0]` 复制成顶层结果。

批量请求：

```json
{
  "items": [
    { "id": "order-1", "text": "地址一" },
    { "id": "order-2", "text": "地址二" }
  ],
  "options": { "maxCandidates": 10 }
}
```

批量接口逐项返回 `results` 数组或错误，不能因为一条非法输入导致整批失败。

### 8.3 HTTP 状态码

- `200`：请求处理成功；无匹配时返回空 `results` 和 `NO_MATCH` 警告；
- `400`：JSON 或参数结构错误；
- `413`：请求体或批次数量超过限制；
- `415`：不支持的 Content-Type；
- `429`：超过限流；
- `500`：未预期的服务端错误；
- `503`：数据未加载完成或服务未就绪。

错误结构统一为：

```json
{
  "requestId": "01...",
  "error": {
    "code": "INVALID_INPUT",
    "message": "text must be a non-empty string",
    "details": []
  }
}
```

### 8.4 配置与运维

Server 配置优先级：命令行参数 > 环境变量 > 配置文件 > 默认值。

至少支持：

- host、port；
- 请求体大小和批次上限；
- CORS allowlist，默认不开放任意来源；
- 请求超时和优雅关闭；
- JSON 结构化日志；
- 健康检查和 readiness；
- 可选限流；
- 代理头信任开关；
- 自定义行政数据路径。

默认日志不得记录原始地址、姓名、电话和身份证。调试日志也只允许通过显式配置开启，并对敏感字段脱敏。

## 9. 结果兼容与版本策略

### 9.1 版本维度

V4 同时公开两个版本：

- `parserVersion`：算法和 SDK 版本，遵守 SemVer；
- `dataVersion`：行政区划数据版本，可独立更新。

仅更新行政数据、不改变 API 结构时发布 patch 版本，但 release notes 必须列出新增、撤销和更名的行政区划。

### 9.2 API 稳定性

- npm 主入口和 `/v1` HTTP 契约在 V4 生命周期内保持向后兼容；
- 新字段可以增加，已有字段不能静默改变类型；
- 行为或字段破坏性变化进入 V5 或新的 `/v2` HTTP 路径；
- 未公开的内部文件不允许通过深路径导入，统一由 `exports` 限定入口。

## 10. 测试策略

### 10.1 黄金语料

从 README、历史 issue 和真实业务数据中建立脱敏语料，覆盖：

- 完整四级地址；
- 缺省、缺市、缺区县；
- 直辖市；
- 自治区、自治州、盟和地区；
- 同名市、区县、街道；
- 行政区划简称；
- 姓名在前、在后或缺失；
- 手机、座机、分机、多号码；
- 邮编独立或嵌入地址；
- 身份证合法、非法和与电话相邻；
- 多空格、换行、全角字符、特殊符号；
- OCR 常见噪声；
- 公司名、门店名和备注干扰；
- 超长输入、空输入和非字符串输入。

每条用例区分：

- 必须精确相等的字段；
- 允许为空的字段；
- 允许的候选集合；
- 最低置信度；
- 必须出现的 warning。

### 10.2 测试层次

- 单元测试：标准化、正则实体、索引、评分器、结果组装；
- 语料回归：整体准确率及按地址类型拆分的指标；
- 属性测试：随机标点、空格和标签不应改变行政路径；
- 模糊测试：任意字符串不能导致崩溃或超时；
- 性能测试：初始化、单条、批量和并发服务；
- 包测试：从 npm tgz 分别执行 ESM、CJS、Browser ESM 和 IIFE；
- API 合约测试：状态码、错误体、批量部分失败、请求限制；
- V3 兼容测试：legacy 输出字段与迁移文档一致。

### 10.3 初始质量门槛

具体阈值在第一批标注语料完成后冻结，至少包括：

- 省、市、区县、街道各级 precision / recall / F1；
- 完整行政路径准确率；
- 姓名、电话、邮编、身份证字段准确率；
- 低置信度结果的校准误差；
- Node 预热后单条解析 p50 / p95 / p99；
- 浏览器主线程初始化与首次解析耗时；
- npm 和浏览器构建体积预算；
- V3 基准语料不得出现未审批的正确率回退。

性能目标必须在固定机器、固定 Node 版本、固定数据版本下报告，不能只给出“毫秒级”描述。

## 11. 数据治理

- 原始行政数据、清洗规则、别名和生成产物分离；
- 每次生成执行 schema、父子编码、重名、空名称、重复编码和孤儿节点校验；
- 生成过程必须确定性，相同输入产生相同 checksum；
- 行政区划更名保留历史别名，但输出当前标准名称；
- 自定义业务别名不得直接混入官方源数据；
- 数据源许可证、更新时间和生成脚本随仓库保留；
- 发布包只包含运行所需的紧凑数据，不包含重复的 JSON/JS 副本。

## 12. 安全与隐私

- 核心默认不联网，不上传输入；
- API 默认不记录原始文本；
- `includeInput` 默认为 `false`；
- 身份证提取允许通过配置关闭；
- HTTP 请求体、字符串长度和批次数量有硬限制；
- 自定义插件只能在宿主进程权限内运行，Server 不提供远程上传并执行插件的能力；
- Docker 以非 root 用户运行，文件系统尽量只读；
- 发布流程生成依赖清单并执行依赖与许可证检查。

## 13. 实施里程碑

### M0：基线冻结

- 建立 V3 黄金语料和基准脚本；
- 记录浏览器版与 Node 版差异；
- 冻结 V4 数组结果类型、字段和 V3 兼容映射；
- 确认行政区划数据来源及授权。

交付：测试语料、基准报告、API 类型草案。

### M1：Core MVP

- 完成标准化与 offset 映射；
- 完成电话、身份证和邮编提取器；
- 生成行政区划索引；
- 实现候选生成、路径校验和第一版评分；
- 实现 `parseAddress`、`parseAddressBatch`、`createParser`。

交付：可测试的 TypeScript core，暂不发布。

### M2：npm SDK

- 构建 ESM、CJS 和类型声明；
- 实现 package exports；
- 实现 V3 legacy 入口；
- 完成 tgz 安装测试和 canary 发布。

交付：`address-smart-parse@4.0.0-rc.x`。

### M3：浏览器交付

- 构建 Browser ESM 与 IIFE；
- 验证 CDN 和本地 Script 引入；
- 生成包体与浏览器性能报告；
- 完成演示页面迁移。

交付：可由 CDN 直接引用的浏览器构建。

### M4：API Server

- 实现 `/v1/parse`、`/v1/parse/batch` 和健康检查；
- 实现配置、限流、日志、错误处理和优雅关闭；
- 提供 npm CLI 和 Docker 镜像；
- 完成 API 合约与负载测试。

交付：`address-smart-parse-server@4.0.0-rc.x` 与 Docker 镜像。

### M5：正式发布

- 修复 RC 反馈；
- 冻结质量门槛；
- 补全 README、API 文档、数据文档和迁移指南；
- 发布 npm latest；
- 保留 3.x 安全修复分支，停止新增功能。

交付：SDK 与 Server 4.0.0 正式版。

## 14. 关键决策

| 决策 | V4 选择 | 原因 |
| --- | --- | --- |
| 核心算法 | 词典候选 + 行政层级评分 | 可解释、离线、适合有限行政词典 |
| 正则职责 | 电话等确定性实体 | 避免用正则承担行政消歧 |
| 机器学习 | 可插拔，不进入 V4.0 核心 | 控制包体、部署和确定性 |
| 运行模型 | 无状态同步核心 | 浏览器、Node 和 Server 可完全复用 |
| npm 模块 | 同源构建 ESM + CJS | 同时支持 import 与 require |
| 浏览器 | Browser ESM + IIFE | 兼顾现代构建工具与传统 Script |
| API | 独立 Server 包 | 不让 SDK 用户安装服务端依赖 |
| 数据 | 构建期生成紧凑索引 | 避免运行时反复遍历和多份数据 |
| 歧义处理 | 始终返回候选数组 | 不把同名地址伪装成唯一确定结果 |
| 默认选择 | 不自动选择第一条 | 选择权由调用方或人工确认流程掌握 |
| Node 基线 | Node.js 22+ | 采用仍受支持的 LTS 版本 |

## 15. 开始实施前需要冻结的事项

1. 是否继续使用现有 npm 名称 `address-smart-parse`；
2. `address-smart-parse-server` 包名是否可注册或已由项目方持有；
3. V4 是否必须默认内置全部乡镇街道数据；
4. V3 `/legacy` 兼容入口的保留周期；
5. 行政区划数据更新频率和责任人；
6. 商用授权条款与 npm 包许可证是否一致；
7. 首批真实脱敏语料的来源与验收人。

其中第 3 项直接影响浏览器包体，第 6 项会影响 npm 用户是否能够合法使用，必须在 RC 发布前解决。

## 16. 参考

- [Node.js Packages：`exports` 与 ESM/CJS 条件导出](https://nodejs.org/api/packages.html)
- [npm package.json：`files`、`bin` 等发布字段](https://docs.npmjs.com/cli/configuring-npm/package-json/)
- [Node.js 官方版本生命周期](https://nodejs.org/en/about/previous-releases)
