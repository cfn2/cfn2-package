const { extname } = require('path');
const { writeFile } = require('fs');
const { URL } = require('url');
const yaml = require('js-yaml');
const AWS = require('aws-sdk');

function writeTemplate(path, template, callback) {
  if (path.startsWith('s3:')) {
    const urlObj = new URL(path);
    const {
      host,
      pathname,
    } = urlObj;

    const s3 = new AWS.S3();

    const params = {
      Bucket: host,
      Key: pathname.substr(1),
      Body: JSON.stringify(template, null, 2),
      ContentType: 'application/json',
    };

    s3.putObject(params, (err, data) => {
      if (err) {
        return callback(err);
      }

      callback(null);
    });
  } else {
    const ext = extname(path);

    if (ext === '.yml' || ext === '.yaml') {
      writeFile(path, yaml.safeDump(template), callback);
    } else {
      writeFile(path, JSON.stringify(template, null, 2), callback);
    }
  }
}

exports.writeTemplate = writeTemplate;
