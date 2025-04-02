const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');
const fs = require('fs');
const CONFIG = require('./config');

const args = process.argv.slice(2); // 获取命令行参数
const env = args[0]; // 获取第一个参数，例如 "dev" 或 "test"

if (!env) {
  env = 'dev';
  console.log('未设置目标环境,默认打包dev环境。 Use “npm run build dev” or “npm run build test”');
}

console.log(`Running build for environment: ${env}环境`);

const localBuildPath = path.join(__dirname, '../out');
const remotePath = CONFIG[env].remotePath; //home/dbgpt/nova-abi-platform/extra/app/static';
const serverDetails = CONFIG[env].serverDetails;

const parentDir = path.join(__dirname, '../../'); // 上一级目录
const localRepoPath = path.join(parentDir, 'temp-repo'); // 临时本地路径，用于克隆仓库
const remoteGitRepo = CONFIG[env].remoteGitRepo; // 远程Git仓库URL
const targetFolder = CONFIG[env].targetFolder; // 远程仓库中的目标文件夹

function getCurrentBranch() {
  return new Promise((resolve, reject) => {
    const exec = require('child_process').exec;
    exec('git rev-parse --abbrev-ref HEAD', (err, stdout, stderr) => {
      if (err) {
        reject(`Error getting current ${stderr}`);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const exec = require('child_process').exec;
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}
async function senChatHook() {
  if (env == 'dev') {
    return;
  }
  let gitCommit = await getGitCommit();
  const exec = require('child_process').exec;
  const curlCommand = `curl 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=' \
-H 'Content-Type: application/json' \
-d '{
    "msgtype": "text",
    "text": {
        "content": "🦄 测试环境前端有新代码部署，请相关同事注意。\n 近期更新内容：\n${gitCommit}",
        "mentioned_mobile_list":["18691868089","18362986021"]
    }
}'`;

  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing curl command: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
  });
}

function getGitCommit() {
  return new Promise((resolve, reject) => {
    const exec = require('child_process').exec;
    exec(`git log --oneline --extended-regexp --grep='<[a-zA-Z]+>' | grep -v 'Merge branch' --max-count=3`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        resolve('');
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        resolve('');
      }

      // 提取包含<feat>的commit信息
      const featCommit = stdout.trim();
      const commitMessages = extractCommitMessages(featCommit);
      resolve(commitMessages.join('\n'));
    });
  });
}

function extractCommitMessages(commitLog) {
  const regex = /<[^>]+>\s*(.+)/;
  const messages = [];

  const lines = commitLog.split('\n');
  lines.forEach((line) => {
    const match = line.match(regex);
    if (match && match[1]) {
      messages.push(match[1].trim());
    }
  });

  return messages;
}

async function deploy() {
  try {
    const currentBranch = await getCurrentBranch();
    if (env == 'dev' && currentBranch !== 'feature_dev') {
      console.error(`× 当前分支：${currentBranch}. dev环境部署 需要在【feature_dev】分支进行打包`);
      process.exit(1);
    }

    if (env == 'test' && currentBranch !== 'feature_test') {
      console.error(`× 当前分支：${currentBranch}. test环境部署 需要在【feature_test】分支进行打包`);
      process.exit(1);
    }

    console.log('Running npm install...');
    const exec = require('child_process').exec;
    await exec('npm install');
    console.log(`Running npm run compile:${env}...`);
    exec(`npm run compile:${env}`, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Build error: ${stderr}`);
        process.exit(1);
      }
      console.log('Build completed successfully.');

      try {
        console.log('Connecting to the server...');
        await ssh.connect(serverDetails);
        if (remotePath.includes(targetFolder)) {
          console.log('Deleting file...');
          ssh.execCommand(`rm -rf ${remotePath}`);
        }
        console.log('Uploading files...');
        await ssh.putDirectory(localBuildPath, remotePath, {
          recursive: true,
          concurrency: 10,
          validate: function (itemPath) {
            const baseName = path.basename(itemPath);
            return baseName !== '.' && baseName !== '..';
          },
          tick: function (localPath, remotePath, error) {
            if (error) {
              console.error(`Failed to transfer ${localPath}`);
            } else {
              console.log(`Transferred ${localPath}`);
            }
          },
        });

        console.log('Files successfully uploaded.');
        console.log('Deployment successfully!');
        // senChatHook();
        fs.rmSync(localRepoPath, { recursive: true, force: true }); // 清理临时克隆的仓库
        console.log('Cloning the remote Git repository...');
        await runCommand(`git clone ${remoteGitRepo} ${localRepoPath}`, parentDir);

        console.log(`Switching to ${CONFIG[env].gitBranch} branch in the cloned `);
        await runCommand(`git checkout origin/${CONFIG[env].gitBranch} -b ${CONFIG[env].gitBranch}`, localRepoPath);

        console.log(`Copying build files to the targe`);
        const targetPath = path.join(localRepoPath, targetFolder);
        fs.rmSync(targetPath, { recursive: true, force: true });
        fs.cpSync(localBuildPath, targetPath, { recursive: true });

        console.log(`Committing and pushing changes to the remote repository...`);

        await runCommand(`git add .`, localRepoPath);
        await runCommand(`git commit -m "<feat>[null]:更新前端静态资源包${new Date().toString()}"`, localRepoPath);
        await runCommand(`git push origin ${CONFIG[env].gitBranch}`, localRepoPath);

        console.log('Build pushed to remote Git repository successfully.');
      } catch (err) {
        console.error(`Deployment failed: ${err.message}`);
      } finally {
        ssh.dispose();
        fs.rmSync(localRepoPath, { recursive: true, force: true }); // 清理临时克隆的仓库
      }
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
