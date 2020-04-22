
## demo

详见```smartWeChatDemo```文件夹
![](https://gitee.com/Wzhichao/img/raw/master/uPic/gh_f3a92bf8c8a5_34447%20.jpg)
![](https://gitee.com/Wzhichao/img/raw/master/uPic/HiovfR25%20.png)
## 小程序引入
务必勾选不检验域名等等
![](https://gitee.com/Wzhichao/img/raw/master/uPic/q50LEr14%20.png)

将仓库中的```smartWeChat```文件夹拷贝到项目中```app.js```的同级目录

![image.png](https://gitee.com/Wzhichao/img/raw/master/uPic/P2DFuD45%20.png)

app.js
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

调用.js
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
[数据来源pcas-code.json](https://github.com/modood/Administrative-divisions-of-China/blob/master/dist/pcas-code.json)

将```pcasCode.js```内的数组内容进行替换即可

### 注，初次加载会调用接口请求数据，后续会从缓存中读取
### 接口地址 http://wangzc.wang:1337

