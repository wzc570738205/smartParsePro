# address-smart-parse-server

`address-smart-parse-server` 是 `address-smart-parse` V4 的 Node.js HTTP API
服务，要求 Node.js 22 或更高版本。

## 直接启动

```bash
npx address-smart-parse-server --host 0.0.0.0 --port 1399
```

也可以使用环境变量：

```bash
SMART_PARSE_HOST=0.0.0.0 SMART_PARSE_PORT=1399 npx address-smart-parse-server
```

## 使用 forever

先安装 `forever`：

```bash
npm install --global forever
```

安装 Server 包后执行：

```bash
npx smart-parse-forever
```

源码仓库中可以执行：

```bash
npm run start:forever
```

默认进程 UID 为 `smart-parse-api`，日志写入当前工作目录的 `logs/`。可以使用
以下环境变量覆盖：

- `SMART_PARSE_HOST`
- `SMART_PARSE_PORT`
- `SMART_PARSE_UID`
- `SMART_PARSE_LOG_DIR`

常用管理命令：

```bash
forever list
forever restart smart-parse-api
forever stop smart-parse-api
```

## 接口

- `POST /v1/parse`
- `POST /v1/parse/batch`
- `GET /healthz`
- `GET /readyz`
- `GET /version`
