// 进程守护程序
const http = require('http');
const child_process = require('child_process');

const PORT = 1399;
const portfinder = require('portfinder');

// 检查端口是否被占用
function checkPort(port) {
    return new Promise((resolve, reject) => {
        portfinder.getPort({
            port: port
        }, (err, foundPort) => {
            if (err) {
                reject(err);
            } else {
                resolve(foundPort !== port);
            }
        });
    });
}

// 启动服务
function startServer() {
    const foreverProcess = child_process.spawn('forever', ['start', '/home/smart-node/server.js'], {
        stdio: 'inherit'
    });
    foreverProcess.on('error', err => {
        console.error('启动服务失败:', err);
    });
}

// 检查端口是否被占用，如果未被占用则启动服务
async function checkAndStart() {
    const portAvailable = await checkPort(PORT);
    if (!portAvailable) {
        console.log(`${Date()}-端口 ${PORT} 未被占用，启动服务...`);
        startServer();
    } else {
        // console.log(`端口 ${PORT} 已被占用，无需启动服务。`);
    }
}

// 每隔一段时间检查端口状态
setInterval(checkAndStart, 5000); // 每隔5秒检查一次

// 第一次立即执行一次检查
checkAndStart();
