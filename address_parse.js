var addressList = []; //地址列表
var zipCodeList = []; //邮编列表

//获取地址以及邮编json
const getJson = new Promise((res, rej) => {
    $.getJSON("./pcas-code.json", data_address => {
        $.getJSON("./zip-code.json", data_code => {

            res({
                'address': data_address,
                'code': data_code
            })
        })
    })
})

getJson.then((res) => {
    addressList = res.address;
    addressList.forEach(item => {
        formatAddresList(item, 1, '')
    })
    zipCodeList = zipCodeFormat(res.code);
    console.log(addressList);
})

/**
 * 地址数据处理
 * @param addressList-各级数据对象
 * @param index-对应的省/市/县区/街道
 * @param province-只有直辖市会处理为  北京市北京市
 * @returns <array>
 */
function formatAddresList(addressList, index, province) {
    if (index === 1) { //省
        addressList.province = addressList.name;
    }
    if (index === 2) { //市
        if (addressList.name == '市辖区') {
            addressList.name = province.name;
        }
        addressList.city = addressList.name;
    }
    if (index === 3) { //区或者县
        addressList.county = addressList.name;
    }
    if (index === 4) { //街道
        addressList.street = addressList.name;
    }
    if (addressList.children) {
        index++;
        addressList.children.forEach(res => {
            formatAddresList(res, index, addressList)
        })
    }
}
/**
 * 解析邮编
 * @param
 * @returns <array>
 */
function zipCodeFormat(zipCode) {
    let list = []
    zipCode.forEach((el) => {
        if (el.child) {
            el.child.forEach((event) => {
                if (event.child) {
                    event.child.forEach(element => {
                        list.push(element.zipcode)
                    })
                }

            })
        }
    })
    return list;
}


var smartObj = {}

function smart(event) {
    event = stripscript(event); //过滤特殊字符
    let obj = {};
    let copyaddress = JSON.parse(JSON.stringify(event))
    copyaddress = copyaddress.split(' ');
    console.log(copyaddress)

    copyaddress.forEach((res, index) => {
        if (res) {
            let addressObj = smatrAddress(res, index)
            obj = Object.assign(obj, addressObj)
            if (JSON.stringify(addressObj) === '{}') {
                obj.name = res;
            }
        }
    })
    return obj;
}

function smatrAddress(event, index) {
    smartObj = {};
    let address = event;
    //address=  event.replace(/\s/g, ''); //去除空格
    address = stripscript(address); //过滤特殊字符
    console.log(address);

    //电话匹配
    let phone = address.match(/(86-[1][0-9]{10}) | (86[1][0-9]{10})|([1][0-9]{10})/g);
    if (phone) {
        smartObj.phone = phone[0];
        address = address.replace(phone[0], '')
    }

    //邮编匹配
    zipCodeList.forEach(res => {
        if (address.indexOf(res) != -1) {
            let num = address.indexOf(res);
            let code = address.slice(num, num + 6);
            smartObj.zipCode = code;
            address = address.replace(code, '')
        }
    })
    let matchAddress = ''
    //省匹配 比如输入北京市朝阳区，会用北  北京  北京市 北京市朝 以此类推在addressList里的province中做匹配，会得到北京市  河北省 天津市等等；
    let matchProvince = []; //粗略匹配上的省份   
    // for (let begIndex = 0; begIndex < address.length; begIndex++) {
    matchAddress = '';
    for (let endIndex = 0; endIndex < address.length; endIndex++) {
        //  if (endIndex > begIndex) {
        matchAddress = address.slice(0, endIndex + 2)
        addressList.forEach(res => {
            if (res['province'].indexOf(matchAddress) != -1) {
                matchProvince.push({
                    province: res.province,
                    provinceCode: res.code,
                    matchValue: matchAddress
                })
            }
        })
        // }
    }
    //  }

    //统计筛选初略统计出的省份
    matchProvince.forEach(res => {
        res.index = 0;
        matchProvince.forEach(el => {
            if (res.province == el.province) {
                el.index++;
                if (res.matchValue.length > el.matchValue.length) {
                    el.matchValue = res.matchValue;
                }
            }
        })
    })
    //console.log(Math.max.apply(Math, matchProvince.map(function(o) {return o.index})))
    if (matchProvince.length != 0) {
        let province = matchProvince.reduce((p, v) => p.index < v.index ? v : p)
        //console.log( matchProvince.reduce((p,v) => p.value < v.value ? v : p))
        smartObj.province = province.province;
        smartObj.provinceCode = province.provinceCode;

        //姓名查找
        /*  let name = address.slice(0, address.indexOf(province.matchValue));
         smartObj.name = name; */
        address = address.replace(province.matchValue, '');

    }
    console.log(address);


    //市查找
    let matchCity = []; //粗略匹配上的市 
    matchAddress = '';
    for (let endIndex = 0; endIndex < address.length; endIndex++) {
        matchAddress = address.slice(0, endIndex + 2)
        addressList.forEach(el => {
            //  if (el.name == smartObj.province) {
            if (smartObj.province == '北京市' || smartObj.province == '天津市' || smartObj.province == '上海市' || smartObj.province == '重庆市') {
                el.children.forEach(item => {
                    item.children.forEach(res => {
                        if (res['county'].indexOf(matchAddress) != -1) {
                            matchCity.push({
                                county: res.county,
                                countyCode: res.code,
                                city: item.city,
                                cityCode: item.code,
                                matchValue: matchAddress,
                                province: el.province,
                                provinceCode: el.code,
                            })
                        }
                    })
                })
            } else {
                el.children.forEach(res => {
                    if (res['city'].indexOf(matchAddress) != -1) {
                        matchCity.push({
                            city: res.city,
                            cityCode: res.code,
                            matchValue: matchAddress,
                            province: el.province,
                            provinceCode: el.code,
                        })
                    }
                })
            }
            // }
        })

    }

    //统计筛选初略统计出的市
    matchCity.forEach(res => {
        res.index = 0;
        matchCity.forEach(el => {
            if (res.city == el.city) {
                el.index++;
                if (res.matchValue.length > el.matchValue.length) {
                    el.matchValue = res.matchValue;
                }
            }
        })
    })
    if (matchCity.length != 0) {
        let city = matchCity.reduce((p, v) => p.index < v.index ? v : p)
        smartObj.city = city.city
        smartObj.cityCode = city.cityCode
        smartObj.county = city.county
        smartObj.countyCode = city.countyCode
        if (!smartObj.province) {
            smartObj.province = city.province
            smartObj.provinceCode = city.provinceCode
        }
        address = address.replace(city.matchValue, '')
    }
    console.log(address);

    //区县查找
    let matchCounty = []; //粗略匹配上的区县
    matchAddress = '';
    for (let endIndex = 0; endIndex < address.length; endIndex++) {
        matchAddress = address.slice(0, endIndex + 2)
        addressList.forEach(el => {
            //  if (el.name == smartObj.province) {
            if (smartObj.province == '北京市' || smartObj.province == '天津市' || smartObj.province == '上海市' || smartObj.province == '重庆市') {
                //nothing
            } else {
                el.children.forEach(item => {
                    //  if (item.name == smartObj.city) {
                    item.children.forEach(res => {
                        if (res['county'].indexOf(matchAddress) != -1) {
                            matchCounty.push({
                                county: res.county,
                                countyCode: res.code,
                                city: item.city,
                                cityCode: item.code,
                                matchValue: matchAddress,
                                province: el.province,
                                provinceCode: el.code,
                            })
                        }
                    })
                    //  }
                })
            }
            //  }
        })

    }

    //统计筛选初略统计出的区县
    matchCounty.forEach(res => {
        res.index = 0;
        matchCounty.forEach(el => {
            if (res.city == el.city) {
                el.index++;
                if (res.matchValue.length > el.matchValue.length) {
                    el.matchValue = res.matchValue;
                }
            }
        })
    })
    if (matchCounty.length != 0) {
        let city = matchCounty.reduce((p, v) => p.index < v.index ? v : p)
        smartObj.county = city.county
        smartObj.countyCode = city.countyCode
        if (!smartObj.province) {
            smartObj.province = city.province
            smartObj.provinceCode = city.provinceCode
        }
        if (!smartObj.city) {
            smartObj.city = city.city
            smartObj.cityCode = city.cityCode
        }
        address = address.replace(city.matchValue, '')
    }
    console.log(address);

    //街道查找
    let matchStreet = []; //粗略匹配上的街道查 
    matchAddress = '';
    for (let endIndex = 0; endIndex < address.length; endIndex++) {
        matchAddress = address.slice(0, endIndex + 2)
        addressList.forEach(el => {
            if (el.name == smartObj.province) {
                if (smartObj.province == '北京市' || smartObj.province == '天津市' || smartObj.province == '上海市' || smartObj.province == '重庆市') {
                    //nothing
                } else {
                    el.children.forEach(element => {
                        if (element.name == smartObj.city) {
                            element.children.forEach(item => {
                                if (item.name == smartObj.county) {
                                    item.children.forEach(res => {
                                        if (res['street'].indexOf(matchAddress) != -1) {
                                            matchStreet.push({
                                                street: res.street,
                                                streetCode: res.code,
                                                matchValue: matchAddress
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            }
        })

    }

    //统计筛选初略统计出的区县
    matchStreet.forEach(res => {
        res.index = 0;
        matchStreet.forEach(el => {
            if (res.city == el.city) {
                el.index++;
                if (res.matchValue.length > el.matchValue.length) {
                    el.matchValue = res.matchValue;
                }
            }
        })
    })

    if (matchStreet.length != 0) {
        let city = matchStreet.reduce((p, v) => p.index < v.index ? v : p)
        smartObj.street = city.street
        smartObj.streetCode = city.streetCode
        address = address.replace(city.matchValue, '')
    }
    //姓名查找
    if (smartObj.province) {
        smartObj.address = address;
    }
    console.log(address);

    return smartObj;
}

function stripscript(s) {
    var pattern = new RegExp("[`~!@#$^&*()=|{}':;',\\[\\].<>/?~！@#￥……&*（）——|{}【】‘；：”“’。，、？-]")
    var rs = "";
    for (var i = 0; i < s.length; i++) {
        rs = rs + s.substr(i, 1).replace(pattern, '');
    }
    rs = rs.replace(/[\r\n]/g, "");
    return rs;
}