# 地址智能识别node后端接口使用文档

#### 介绍
地址智能识别是通过 中华人民共和国行政区划提供的数据进行前端静态地址匹配分析的轻量化解析项目，初步面向物流/快递等涉及到地址处理的使用场景，可以把用户的详细地址切分为对应的省市区、姓名、电话等等。

#### 软件架构
软件架构说明
采用`node.js`进行开发


#### 安装教程

1.  服务器安装node环境
```sh
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
```
```sh
sudo yum install nodejs
```
2.  安装`forever`node持久化服务[地址](https://www.npmjs.com/package/forever)
```sh
npm install forever -g
```
3.  进入软件安装目录  启动服务

```sh
cd /smartParsePro/node
```
```sh
forever start server.js
```
4. 默认端口`1399`

#### 使用说明

1.  端口修改
index.js文件中修改第一行 `port`变量即可
2.docker化
[参考](https://nodejs.org/zh-cn/docs/guides/nodejs-docker-webapp/)

#### 查看当前运行的系统信息
```sh
forever list
```
输出如下信息
```sh
info:    Forever processes running
data:    uid  command       script    forever pid  id logfile   uptime                    
data:    [0] IMAA /usr/bin/node server.js 1558   1565   /root/.forever/IMAA.log 0:0:14:25.581999999999994 
```
![](https://gitee.com/Wzhichao/img/raw/master/uPic/2iaN5Y14%20.png)
其中`/root/.forever/IMAA.log`为日志文件信息
#### 停止当前运行的系统
```sh
forever stop 0 # 0即为上一步中的[0]
```
