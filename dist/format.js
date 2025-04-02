/*
 * @Author: wangzhichiao<https://github.com/wzc570738205>
 * @Date: 2020-11-15 21:38:29
 * @LastEditors: wangzhichiao<https://github.com/wzc570738205>
 * @LastEditTime: 2021-09-14 11:28:04
 */

let code =
  "[`~!@#$^&*()=|{}':;',\\[\\].<>/?~！@#￥……&*（）——|{}【】‘；：”“’。，、？-] ";
let keyM = [
  "联系电话",
  "电话",
  "联系人手机号码",
  "联系人",
  "手机号码",
  "手机号",
  "手机",
  "邮编",
  "姓名",
  "收货人",
  "收件人",
];
//地址特殊处理
let keyA = [
  "收货地址",
  "收件地址",
  "退货地址",
  "所在地区",
  "所在地",
  "联系地址",
  "送货地址",
  "详细地址",
  "地区",
  "地址",
];

let keyC = ["省 ", "市 ", "区 ", "道 ", "县 ", "镇 ", "处 ", "栋 "];
let keyD = [
  "重庆 ",
  "上海 ",
  "北京 ",
  "天津 ",
  "市辖区",
  "86-",
  "(86)",
  "（",
  "）",
  "&middot;",
];
let keyMs = [];
let keyAs = [];
keyM.forEach((e, index) => {
  for (var i = 0; i < code.length; i++) {
    keyMs.push(e + code[i]);
    keyMs.push(e + code[i] + code[i]);
  }
  keyMs.push(e);
});
keyA.forEach((e, index) => {
  for (var i = 0; i < code.length; i++) {
    keyAs.push(e + code[i] + " ");
    keyAs.push(e + code[i] + "  ");
    keyAs.push(e + code[i] + "   ");
    keyAs.push(e + code[i]);
    keyAs.push(e + code[i] + code[i]);
  }
  keyAs.push(e);
});
function formatByKey(s) {
  s = s.replace(/[\r\n\t]/g, "");

  for (var i = 0; i < keyMs.length; i++) {
    s = s.replace(keyMs[i], " ");
  }
  let number = 0;
  for (var i = 0; i < keyAs.length; i++) {
    if (s.indexOf(keyAs[i]) != -1) {
      number++;
      if (number > 1) {
        s = s.replace(keyAs[i], "");
      } else {
        s = s.replace(keyAs[i], " ");
      }
    }
  }

  //过滤掉直辖市
  for (var i = 0; i < keyD.length; i++) {
    s = s.replace(keyD[i], "");
  }

  //过滤掉市区县后面空格
  let index = 0;
  for (let index = 0; index < 3; index++) {
    for (let i = 0; i < keyC.length; i++) {
      if (s.indexOf(keyC[i]) != -1) {
        index++;
      }
      let str = keyC[i];
      s = s.replace(keyC[i], str.replace(/\s+/g, ""));
    }
  }

  if (index > 3) {
    s = s.replace(/\s+/g, "");
  }


  return s;
}
export default formatByKey
