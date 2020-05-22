<!--
 * @Author: wangzhichiao<https://github.com/wzc570738205>
 * @Date: 2020-04-21 14:24:59
 * @LastEditors: wangzhichiao<https://github.com/wzc570738205>
 * @LastEditTime: 2020-05-22 10:15:09
 -->


## demo

详见```demo```文件夹

![](https://gitee.com/Wzhichao/img/raw/master/uPic/HiovfR25%20.png) 

## 小程序引入
务必勾选不检验域名等等
![](https://gitee.com/Wzhichao/img/raw/master/uPic/q50LEr14%20.png)

将仓库中的```smartWeChat```文件夹拷贝到项目中```app.js```的同级目录

![image.png](https://gitee.com/Wzhichao/img/raw/master/uPic/P2DFuD45%20.png)

> smartWeChat/js/address_parse.js（自建后台）

如需要自行构建后台，json文件在demo/后台json/database_export-sw0HKSJkxA1j.json

这里需要将demo里的接口替换为后台提供的接口，接口格式返回可以参考http://wangzc.wang:1337/1

后台json文件···demo/后台json/database_export-sw0HKSJkxA1j.json```

> app.js
```
var address_parse = require("./smartWeChat/js/address_parse");

...
...
...

App({
  ....
  smart: function (val){
    return address_parse.method(val || '')
  },
  getAddressData:function(){//手动重新挂载数据
    address_parse.getData()
  }
})

```

> 调用.js
```
const app = getApp()
//注意！！省市区文件加载时间可能略长
//需要识别调用  
app.smart('新疆阿克苏温宿县博孜墩柯尔克孜族乡吾斯塘博村一组306号 150-3569-6956 马云')

//ex
//这里改为事件触发即可
onLoad: function() {
   setTimeout(function(){
      app.getAddressData()//保险起见，手动挂载数据
      var address = app.smart('广东省珠海市香洲区盘山路28号幸福茶庄,陈景勇，13593464918')
      console.log(address)
  },10000) 
}

```
### 数据源跟换

由于小程序限制文件大小不能超过2MB，所以数据以接口返回，若需要更新请加群联系作者

### 注，初次加载会调用接口请求数据，后续会从缓存中读取
### 接口地址 http://wangzc.wang:1337
