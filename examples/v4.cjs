'use strict';

const { parseAddress } = require('address-smart-parse');

const samples = [
  '浙江省金华市婺城区西关街道金磐路15180231234 李节霁',
  '鼓楼区中山北路1号 王五 13900000000',
  '雁塔区丈八沟街道高新四路高新大都荟710061 刘国良 13593464918 211381198512096810',
  '这不是地址 张三 13800138000',
];

for (const input of samples) {
  console.log(`\n输入：${input}`);
  console.dir(parseAddress(input), { depth: null });
}
