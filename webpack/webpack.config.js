const path = require("path");
const resolve = (dir) => path.join(__dirname, dir);

module.exports = {
  entry: {
    address_parse: [
      "../dist/pcasCode.js",
      "../dist/zipCode.js",
      "../dist/address_parse.js",
    ],
  },
  output: {
    filename: "[name].min.js",
    path: resolve("../dist/min"),
    clean: true,
  },
};
