
## 小程序引入

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
  }
})

```

调用.js
```
const app = getApp()

//需要识别直接调用
app.smart('新疆阿克苏温宿县博孜墩柯尔克孜族乡吾斯塘博村一组306号 150-3569-6956 马云')

//ex
 onLoad: function() {
   var address = app.smart('新疆阿克苏温宿县博孜墩柯尔克孜族乡吾斯塘博村一组306号 150-3569-6956 马云')
  console.log(address)
  }

```
### 数据源跟换
[数据来源pcas-code.json](https://github.com/modood/Administrative-divisions-of-China/blob/master/dist/pcas-code.json)

将```pcasCode.js```内的数组内容进行替换即可
