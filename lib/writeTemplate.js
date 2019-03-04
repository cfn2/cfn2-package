const { extname } = require('path');
const { writeFile } = require('fs');
const yaml = require('js-yaml');

function writeTemplate(path, template, callback) {
  const ext = extname(path);

  if (ext === '.yml' || ext === '.yaml') {
    writeFile(path, yaml.safeDump(template), callback);
  } else {
    writeFile(path, JSON.stringify(template, null, 2), callback);
  }
}

exports.writeTemplate = writeTemplate;
