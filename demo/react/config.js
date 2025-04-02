const CONFIG = {
  dev: {
    serverDetails: {
      host: '172.16.22.55',
    },
    remotePath: '/home/nova/nova-abi-platform/extra/app/static',
    remoteGitRepo: 'http://git.novatools.vip/novacloud/llm-platform/nova-abi-platform.git', // 远程Git仓库URL
    gitBranch: 'feature_dev',
    targetFolder: 'extra/app/static', // 远程仓库中的目标文件夹
  },

  test: {
    serverDetails: {
      host: '172.16.21.63',
    },
    remotePath: '/home/dbgpt/nova-abi-platform/extra/app/static',
    remoteGitRepo: 'http://git.novatools.vip/novacloud/llm-platform/nova-abi-platform.git', // 远程Git仓库URL
    gitBranch: 'feature_test',
    targetFolder: 'extra/app/static', // 远程仓库中的目标文件夹
  },
};

module.exports = CONFIG;
