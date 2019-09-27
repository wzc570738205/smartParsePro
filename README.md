
# 智能识别收货地址Pro/省市区街道四级联动（支持省市区县街道/姓名/电话/邮编/身份证号码识别）
## 点击此处预览：[预览地址](https://wzc570738205.github.io/smartParsePro/)


## 欢迎加群：[749539640](https://jq.qq.com/?_wv=1027&k=55bQp1O)
![image.png](https://images.zenhubusercontent.com/5a2f3a3e8a75884b908ac8c4/841a8f31-052d-4afe-a6b9-8cdb72d4e4a7)
## 地址数据来源(数据不对请更新此json)
更新方法：将此json文件内容复制至同名js里的var pcassCode=xxxx;

[pcas-code.json](https://github.com/modood/Administrative-divisions-of-China/blob/master/dist/pcas-code.json)

## 支持以下数据格式（地址、姓名、电话、邮编、身份证号码【字母大写】用空格或者特殊字符分开!!）
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
## 使用
```
smart("陕西省西安市雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810")
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

