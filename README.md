<!--
 * @Author: wangzhichiao<https://github.com/wzc570738205>
 * @Date: 2020-04-15 11:34:04
 * @LastEditors: wangzhichiao<https://github.com/wzc570738205>
 * @LastEditTime: 2020-05-13 14:45:32
 -->

# 智能识别收货地址Pro（支持vue）/省市区街道四级联动（支持省市区县街道/姓名/电话/邮编/身份证号码识别）

## 点击此处预览：[预览地址(请耐心等待加载)](http://wangzc.wang/smartParsePro/)


## 欢迎加群：[749539640](https://jq.qq.com/?_wv=1027&k=55bQp1O)
![image.png](https://s2.ax1x.com/2020/01/02/lYkqdx.png)
## 地址数据来源(数据不对请更新此json)
更新方法：将此json文件内容复制至同名js里的var pcassCode=xxxx;

[pcas-code.json(点击前往)](https://github.com/modood/Administrative-divisions-of-China/blob/master/dist/pcas-code.json)

## 支持以下数据格式
### 注意：地址、姓名、电话、邮编、身份证号码【字母大写】用空格或者特殊字符分开!!

特殊字符(可自行添加)：
```
~!@#$^&*()=|{}':;',\\[\\].<>/?~！@#￥……&*（）——|{}【】‘；：”“’。，、？-

```
 1. 广东省珠海市香洲区盘山路28号幸福茶庄,陈景勇，13593464918
2. 马云，陕西省西安市雁塔区丈八沟街道高新四路高新大都荟  13593464918
3. 陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810
4. 西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810
5. 雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810
6. 北京市朝阳区姚家园3楼 13593464918 马云
7. 河北省石家庄市新华区中华北大街68号鹿城商务中心6号楼1413室 150-3569-6956 马云
## 不支持的数据格式
陕西省西安市雁塔区丈八沟街道高新四路高新大都荟马云13593464918

## 地址切分规则
1. `省市区(县)街道详细地址`+`电话`+`邮编`+`姓名`+`身份证号码`
## 使用方法

### 1.api调用


接口地址：```http://wangzc.wang:1338```

请求方式： ```POST```

请求参数： 
```
{
  "address":"广东省珠海市香洲区盘山路28号幸福茶庄,陈景勇，13593464918"
}
```
返回内容： 
```
{
    "province":"广东省",
    "provinceCode":"44",
    "city":"珠海市",
    "cityCode":"4404",
    "county":"香洲区",
    "countyCode":"440402",
    "address":"盘山路28号幸福茶庄",
    "name":"陈景勇",
    "phone":"13593464918"
}
```
api使用推荐axios
```
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>

    axios({
      method: "post",
      url: "http://wangzc.wang:1338",
      data: {
        address: '广东省珠海市香洲区盘山路28号幸福茶庄,陈景勇，13593464918',
      },
    }).then(function (res) {});
```
![img](https://gitee.com/Wzhichao/img/raw/master/uPic/Fxfp4P10%20.png)
### 2.ES5使用（建议下载demo查看引入js顺序以及调用方法）
```
<script src="js/pcasCode.js"></script>
<script src="js/zipCode.js"></script>
<script src="js/address_parse.js"></script>

smart("陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810")
```
### 3.小程序使用（地址如果老旧请联系我进行更改）
将仓库中的```smartWeChat```文件夹拷贝到项目中```app.js```的同级目录
> 详见smartWeChat=>README.md
[文档地址](https://github.com/wzc570738205/smartParsePro/tree/master/smartWeChat)
### 4.1 vue环境下使用（推荐）
index.html引入js(文件可自行下载部署在自己服务器上)
```
<script src="https://wzc570738205.github.io/smartParsePro/js/pcasCode.js"></script>
<script src="https://wzc570738205.github.io/smartParsePro/js/zipCode.js"></script>
<script src="https://wzc570738205.github.io/smartParsePro/js/address_parse2.js"></script>
```

xxx.vue（address_parse2.js会暴露全局window方法 smart）
```
mounted() {
  console.log(window.smart('wzc 山西省'))
}
```
### 4.2[vue环境下使用](https://github.com/wzc570738205/vue-smart-parse) 这种方法会导致打包体积大

```
npm install  vue-smart-parse -d -s
```

```
 // main.js
 import smartParse from 'vue-smart-parse';
 Vue.use(smartParse)
 // App.vue
console.log(this.smartParse('浙江省杭州市西湖区盘山路28号幸福茶庄 陈红 13593464918'));
```


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

#### 请作者喝杯咖啡☕️
![](https://gitee.com/Wzhichao/img/raw/master/uPic/uaFwEM23%20.png)


