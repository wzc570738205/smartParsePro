![](https://gitee.com/Wzhichao/img/raw/master/uPic/logo14%20.png)

# 智能识别收货地址Pro /省市区街道四级联动（支持省市区县街道/姓名/电话/邮编/身份证号码识别）
### 文档地址：[gitee](http://wzhichao.gitee.io/smartParse) |  [语雀](https://www.yuque.com/books/share/72418abc-287d-4a67-ae3c-dad10928c631?#) 

### 在线预览： [示例一](https://wangzc.wang/smartParsePro/) | [示例二](http://wzhichao.gitee.io/smartparse/#/smartParse/smartParse/example1) | [备用地址1](http://wzhichao.gitee.io/smartparsepro/)


### 交流Q群：[749539640](https://jq.qq.com/?_wv=1027&k=55bQp1O)

> 地址识别问题请@群主

![image.png](https://s2.ax1x.com/2020/01/02/lYkqdx.png)
## 地址数据来源(数据不对请更新此json)

更新方法：将此json文件内容复制至同名js里的var pcassCode=xxxx;

[pcas-code.json(点击前往)](https://github.com/modood/Administrative-divisions-of-China/blob/master/dist/pcas-code.json)

## 港澳台地址

参考[港澳台](https://github.com/modood/Administrative-divisions-of-China/issues/27) 可进行自整理

## 支持以下数据格式
### 注意：地址、姓名、电话、邮编用空格或者特殊字符分开!!

特殊字符(可自行添加)：
```
~!@#$^&*()=|{}':;',\\[\\].<>/?~！@#￥……&*（）——|{}【】‘；：”“’。，、？-

```
### js支持地址格式

 1. 广东省珠海市香洲区盘山路28号幸福茶庄,陈景勇，13593464918
2. 马云，陕西省西安市雁塔区丈八沟街道高新四路高新大都荟  13593464918
3. 陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810
4. 西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810
5. 雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810
### 接口额外支持关键字多种地址格式
6. 收货人: 李节霁
手机号码: 15180231234
所在地区: 浙江省金华市婺城区西关街道
详细地址: 金磐路上坞街
7. 收货人: 马云
手机号码: 150-3569-6956
详细地址: 河北省石家庄市新华区中华北大街68号鹿城商务中心6号楼1413室

## 不支持的数据格式
陕西省西安市雁塔区丈八沟街道高新四路高新大都荟马云13593464918

## 地址切分规则
1. `省市区(县)街道详细地址`+`电话`+`邮编`+`姓名`+`身份证号码`
## 使用方法

### 1.api调用(部署腾讯云，没有调用限制，需要自行部署请加群联系群主)

```
request url：https://wangzc.wang/smAddress

request methods: POST

request payload: 

{
    "address": "新疆阿克苏温宿县博孜墩柯尔克孜族乡吾斯塘博村一组306号 150-3569-6956 马云",
    "addressList": [
        "新疆阿克苏温宿县博孜墩柯尔克孜族乡吾斯塘博村一组306号 150-3569-6956 马云",
        "雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810"
    ]
}

//address 字段为单条识别
//addressList 字段为集合识别  返回在response的list字段中

response： 

{
    "province": "新疆维吾尔自治区",
    "provinceCode": "65",
    "city": "阿克苏地区",
    "cityCode": "6529",
    "county": "温宿县",
    "countyCode": "652922",
    "street": "博孜墩柯尔克孜族乡",
    "streetCode": "652922207",
    "address": "吾斯塘博村一组306号",
    "phone": "15035696956",
    "name": "马云",
    "requestNumber": 7,
    "list": [
        {
            "province": "新疆维吾尔自治区",
            "provinceCode": "65",
            "city": "阿克苏地区",
            "cityCode": "6529",
            "county": "温宿县",
            "countyCode": "652922",
            "street": "博孜墩柯尔克孜族乡",
            "streetCode": "652922207",
            "address": "吾斯塘博村一组306号",
            "phone": "15035696956",
            "name": "马云"
        },
        {
            "zipCode": "710061",
            "county": "雁塔区",
            "countyCode": "610113",
            "province": "陕西省",
            "provinceCode": "61",
            "city": "西安市",
            "cityCode": "6101",
            "street": "丈八沟街道",
            "streetCode": "610113007",
            "address": "高新四路高新大都荟",
            "name": "刘国良",
            "phone": "13593464918",
            "idCard": "211381198512096810"
        }
    ]
}

```
api使用推荐axios
```
<script src="https://unpkg.com/axios/dist/axios.min.js"></script>

axios({
  method: "post",
  url: "https://wangzc.wang/smAddress",
  data: {
    address: '广东省珠海市香洲区盘山路28号幸福茶庄,陈景勇，13593464918',
  },
}).then(function (res) {});
```
### 2.NPM
```
npm install address-smart-parse
```
```
import smart from 'address-smart-parse'

// console.log(smart('xxxxxxx))
```
### 3.js引入（建议下载demo查看引入js顺序以及调用方法或者在线预览）
[在codepen中在线预览](https://codepen.io/wzc570738205/pen/RwrjLbq)
```
<script src="js/pcasCode.js"></script>
<script src="js/zipCode.js"></script>
<script src="js/address_parse.js"></script>
//gitee
<script src="http://wzhichao.gitee.io/smartParsePro/js/pcasCode.js"></script>
<script src="http://wzhichao.gitee.io/smartParsePro/js/zipCode.js"></script>
<script src="http://wzhichao.gitee.io/smartParsePro/js/address_parse.js"></script>


smart("陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810")
```
### 4.小程序使用（如需要自行构建后台，json文件在demo/后台json/database_export-sw0HKSJkxA1j.json）
将仓库中的```smartWeChat```文件夹拷贝到项目中```app.js```的同级目录
> 详见smartWeChat=>README.md
[文档地址](https://github.com/wzc570738205/smartParsePro/tree/master/smartWeChat)



## 生成数据格式
```
{
 zipCode:710061

 province:陕西省

 provinceCode:61

 city:西安市

 cityCode:6101

 county:雁塔区

 countyCode:610113

 street:丈八沟街道

 streetCode:610113007

 address:高新四路高新大都荟

 name:刘国良

 phone:13593464918

 idCard:211381198512096810
}
```


##### 地址数据来源：[中华人民共和国行政区划](https://github.com/modood/Administrative-divisions-of-China)
##### 邮编数据来源：[中华人民共和国邮编](https://github.com/xieranmaya/china-city-area-zip-data/blob/master/china-city-area-zip.json)
#### LICENSE：[Apache License](https://github.com/wzc570738205/smartParsePro/blob/master/LICENSE)
#### IDE:致谢[JetBrains](https://www.jetbrains.com/?from=smartParsePro)为本项目提供免费的license支持
[![JetBrains](http://cdn.wangzc.wang/LOGO-1.png)](https://www.jetbrains.com/?from=smartParsePro)
#### 赞助商
[![礼品云](http://www.lipinyun.com/static/images/logo2.png)](http://www.lipinyun.com)
#### 请作者喝杯咖啡☕️
![](http://cdn.wangzc.wang/uPic/cDQzFD.jpg)


