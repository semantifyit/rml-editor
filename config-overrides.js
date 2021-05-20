/* config-overrides.js */
const fs = require('fs');
const path = require("path");

module.exports = function override(config, env) {
  const o = config.module.rules[1].oneOf.find(e => e.loader.endsWith('node_modules/babel-loader/lib/index.js'))
  o.options.sourceType = "unambiguous";
  o.include = [o.include, path.resolve('./node_modules/@rmlio/yarrrml-parser')]
  return config;
}
