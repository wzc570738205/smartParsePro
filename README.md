<p align="center">
  <img src="https://github.com/user-attachments/assets/08e56c19-08c2-4f33-8d88-39e001b2305d" alt="smartparse logo" width="300">
</p>

<h3 align="center">智能解析中文地址 · 支持省市区县/姓名/电话/邮编提取</h3>

<div align="center">
  <a href="https://www.npmjs.com/package/address-smart-parse">
    <img src="https://img.shields.io/npm/v/address-smart-parse.svg?color=blue&label=NPM" alt="npm version">
  </a>
  <a href="https://github.com/wzc570738205/smartParsePro">
    <img src="https://img.shields.io/github/stars/wzc570738205/smartParsePro?style=social" alt="GitHub Stars">
  </a>
  <a href="https://wangzc.wang/smAddress">
    <img src="https://img.shields.io/badge/API-Live-green" alt="Live API">
  </a>
</div>

---

### 🚀 核心功能
- **精准识别**：结合NLP与深度学习，支持省市区县街道四级解析
- **多格式兼容**：支持中文地址、姓名、电话、邮编混合文本的智能拆分
- **灵活接入**：提供API、NPM、Script三种集成方式
- **数据完备**：基于最新行政区划数据，支持外部数据扩展

[👉 Python版本（更高准确率）](https://github.com/wzc570738205/smartParsePro-py) 

[🌐 在线演示](http://47.97.123.182/smartParsePro)


---

### 📦 快速开始
#### 1. NPM安装
```bash
npm install address-smart-parse
```
```js
/**
 * smart 解析地址
 * @param event-识别的地址
 * @param address(3.0版本支持)-地址列表 数据格式请参考 https://github.com/modood/Administrative-divisions-of-China/blob/master/dist/streets.json
 * address 可不传，不传则默认识别到省/市/区县 三级信息
 * @returns <obj>
 */
// 使用包自带的地址数据,这里务必引入address，将参数传入，不然只会识别到省市区县三级信息
import  {smart, address} from 'address-smart-parse'
smart("陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810", address)

// 使用自己的数据
import  {smart} from 'address-smart-parse'
import customAddressData from './custom-streets.json';
// 数据格式请参考 https://github.com/modood/Administrative-divisions-of-China/blob/master/dist/streets.json
smart("陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810", customAddressData)
```
#### 2. API调用（参考 /node 文件）
> 私有部署请联系作者

```bash
POST https://wangzc.wang/smAddress
{
  "address": "浙江省金华市婺城区西关街道金磐路15180231234 李节霁",
  # 多条地址
  "addressList": [ 
        "新疆阿克苏温宿县博孜墩柯尔克孜族乡吾斯塘博村一组306号 150-3569-6956 马云",
        "雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810"
  ]
}

# 响应（200ms内）
{
  "province": "浙江省",
  "city": "金华市",
  "county": "婺城区",
  "street": "西关街道",
  "address": "金磐路",
  "phone": "15180231234",
  "name": "李节霁"
}
```
#### 📌 支持格式
```text
1. 组合式：广东省珠海市香洲区盘山路28号 陈景勇 13593464918
2. 无分隔符：马云 河北省石家庄新华区中华北大街68号鹿城商务中心6号楼1413室
3. 含特殊字符：收货人:李节霁 | 手机:151-8023-1234 | 地址:浙江省金华市婺城区西关街道
4. 短地址：雁塔区高新四路710061 刘国良
```
#### 🛠️ 高级用法
[huggingface接口](https://huggingface.co/spaces/wzc2334234/address)
```js
import { client } from "@gradio/client";

client("wzc2334234/address").predict("/predict", ["地址文本"]).then(res => {
  console.log(JSON.parse(res.data[0]));
});
```
#### 📚 数据来源

地址数据：[中华人民共和国行政区划](https://github.com/modood/Administrative-divisions-of-China)

邮编数据：[中华人民共和国邮编](https://github.com/xieranmaya/china-city-area-zip-data/blob/master/china-city-area-zip.json)


#### 📮 社区支持

![image](https://github.com/user-attachments/assets/2f995a19-3826-4349-a191-886d0406d86b)



[![Star History Chart](https://api.star-history.com/svg?repos=wzc570738205/smartParsePro&type=Date)](https://star-history.com/#wzc570738205/smartParsePro&Date)

#### 👔商用授权
<img width="314" alt="image" src="https://github.com/user-attachments/assets/aac5f491-23e8-4a2f-a4b6-dca7ee97bff3" />



