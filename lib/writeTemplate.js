const { extname } = require('path');
const { writeFile } = require('fs');
const { URL } = require('url');
const yaml = require('js-yaml');
const AWS = require('aws-sdk');

function writeTemplate(path, template, callback) {
  const ext = extname(path);

  const templateData = (ext === '.yml' || ext === '.yaml')
    ? yaml.safeDump(template)
    : JSON.stringify(template, null, 2);

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
      Body: templateData,
      ContentType: 'application/json',
    };

    s3.putObject(params, (err, data) => {
      if (err) {
        return callback(err);
      }

      callback(null);
    });
  } else {
    writeFile(path, templateData, callback);
  }
}

exports.writeTemplate = writeTemplate;
