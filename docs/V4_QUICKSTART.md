# V4 快速测试

## 1. 构建与自动化测试

环境要求：Node.js 22 或更高版本。

```bash
npm install
npm run test:v4
```

`test:v4` 会重新生成 ESM、CommonJS 和浏览器构建，并运行全部测试。

运行语料评估：

```bash
npm run generate:corpus
npm run build
npm run evaluate:corpus
```

当前包含 7 条人工标注回归样本和 186 条覆盖全国 31 个省级区域的确定性生成样本。生成样本分别覆盖完整路径、缺省、缺省市三类输入。生成数据用于验证行政层级与工程回归，不能代替真实业务语料的准确率评估。

## 2. CommonJS

```bash
node examples/v4.cjs
```

代码：

```js
const { parseAddress } = require('address-smart-parse')

const results = parseAddress('鼓楼区中山北路1号 王五 13900000000')
console.log(results)
```

“鼓楼区”存在多个合法行政路径，因此输出是多元素数组。完整、无歧义的地址返回单元素数组；没有行政区划匹配时返回空数组。

## 3. ESM

```bash
node examples/v4.mjs
```

```js
import { parseAddress } from 'address-smart-parse'

const results = parseAddress('北京市朝阳区望京街道阜通东大街6号')
console.log(results)
```

## 4. 浏览器 Script

先执行构建：

```bash
npm run build
```

然后打开 `demo/v4.html`。页面直接加载：

```html
<script src="../packages/sdk/dist/browser/address-smart-parse.global.js"></script>
```

全局入口为：

```js
SmartParse.parseAddress(text)
```

## 5. HTTP API

启动：

```bash
npm run start:api
```

单条解析：

```bash
curl -X POST http://127.0.0.1:1399/v1/parse \
  -H 'content-type: application/json' \
  -d '{
    "text": "鼓楼区中山北路1号 王五 13900000000",
    "options": {
      "maxCandidates": 10
    }
  }'
```

返回结构：

```json
{
  "data": {
    "parserVersion": "4.0.2",
    "dataVersion": "legacy-address-code-v1",
    "results": [
      {"rank": 1, "confidence": 0.31},
      {"rank": 2, "confidence": 0.31}
    ]
  }
}
```

`data.results` 始终为数组。候选按置信度排序，但 API 不提供 `selected`，也不会把第一条复制到顶层。

批量解析：

```bash
curl -X POST http://127.0.0.1:1399/v1/parse/batch \
  -H 'content-type: application/json' \
  -d '{
    "items": [
      {"id": "1", "text": "北京市朝阳区望京街道阜通东大街6号"},
      {"id": "2", "text": "鼓楼区中山北路1号"}
    ]
  }'
```

## 6. V3 兼容入口

### 自定义行政区划数据

V4 支持和 V3 类似的第二参数写法：

```js
import { parseAddress } from 'address-smart-parse'
import customAddressData from './custom-streets.json' with { type: 'json' }

const results = parseAddress(
  '测试省示例市未来区星河街道创新路1号',
  customAddressData
)
```

第三个参数可以传解析选项：

```js
const results = parseAddress(input, customAddressData, {
  minConfidence: 0.3,
  maxCandidates: 20,
  dataVersion: 'company-2026-07'
})
```

上述写法每次调用都会创建自定义索引。批量或高频调用推荐：

```js
import { createParser } from 'address-smart-parse'

const parser = createParser({
  divisions: customAddressData,
  dataVersion: 'company-2026-07'
})

const first = parser.parseAddress(input1)
const second = parser.parseAddress(input2)
```

### 旧版 `smart()`

V4 根入口不再导出 `smart()`。迁移期间可以显式使用：

```js
const { smart, address } = require('address-smart-parse/legacy')
const oldResult = smart('北京市朝阳区望京街道阜通东大街6号', address)
```

兼容入口保留旧版单对象行为，不应在新代码中使用。
