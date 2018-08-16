const { readTemplate } = require('cfn-read-template');
const { pack } = require('npm-lambda-pack');
const parallel = require('run-parallel');
const { dirname, join, resolve } = require('path');
const { request } = require('https');
const { readFile } = require('fs');
const readJson = require('read-json');
const { homedir } = require('os');
const JSZip = require('jszip');
const { zipFiles } = require('jszip-glob');
const { createHash } = require('crypto');

const packageResourceMap = {
  'AWS::Serverless::Function': 'CodeUri',
  'AWS::Serverless::Api': 'DefinitionUri',
  'AWS::ApiGateway::RestApi': 'BodyS3Location',
  'AWS::Lambda::Function': 'Code',
  'AWS::AppSync::GraphQLSchema': 'DefinitionS3Location',
  'AWS::ElasticBeanstalk::Application-Version': 'SourceBundle',
  'AWS::CloudFormation::Stack': 'TemplateURL',
};

function packageTemplate(options, callback) {
  options = { ...options };

  if (options.basedir === undefined) {
    options.basedir = dirname(options.templateFile);
  }

  const templateDir = dirname(options.templateFile);

  readTemplate(options.templateFile, (err, template) => {
    if (err) {
      return callback(err);
    }

    const { Resources } = template;

    if (typeof Resources !== 'object') {
      return callback(new Error('Resources must be an object.'));
    }

    const tasks = Object.entries(Resources).map(([logicalId, resource]) => callback => {
      /*
       * Ignore resources that have no local artifacts.
       */
      const { Type } = resource;
      const propertyName = packageResourceMap[Type];

      if (propertyName === undefined) {
        return callback(null);
      }

      /*
       * Validate Properties.
       */
      const { Properties } = resource;

      if (Properties === undefined) {
        return callback(null);
      }

      if (typeof Properties !== 'object') {
        return callback(new Error(`Resources.${logicalId}.Properties must be an object.`));
      }

      /*
       * Ignore the property if no local artifacts.
       */
      const value = Properties[propertyName];

      if (typeof value !== 'string' || value.startsWith('s3:')) {
        return callback(null);
      }

      /*
       * Read local artifacts.
       */
      const artifactPath = resolve(templateDir, value);

      readFile(artifactPath, (err, file) => {
        if (!err) {
          return upload(file);
        }

        if (err.code !== 'EISDIR') {
          return callback(err);
        }

        const packer = (Type === 'AWS::Serverless::Function' || Type === 'AWS::Lambda::Function')
          ? packFunction : packDirectory;

        return packer(artifactPath, options, (err, file, thumbprint) => {
          if (err) {
            return callback(err);
          }

          upload(file, thumbprint);
        });
      });

      /*
       * Upload the artifact.
       */
      function upload(body, thumbprint) {
        const {
          bucket,
          prefix,
          logger = console,
        } = options;

        const md5OfBody = md5(body);
        const shortMd5 = thumbprint ? thumbprint.substr(0, 16) : md5OfBody.substr(0, 16);

        const path = prefix === undefined
          ? `/${bucket}/${logicalId}-${shortMd5}`
          : `/${bucket}/${prefix}/${logicalId}-${shortMd5}`;

        const s3url = `s3:/${path}`;

        request(options.sign({
          method: 'HEAD',
          service: 's3',
          path,
          headers: {
            'If-None-Match': `"${md5OfBody}"`,
          },
          signQuery: true,
        }), res => {
          const { statusCode } = res;

          if (statusCode === 304) {
            logger.log('Artifact %s of resource %s not modified', artifactPath, logicalId);

            Properties[propertyName] = s3url;
            return callback(null);
          }

          if (statusCode !== 200 && statusCode !== 404) {
            return callback(new Error(`Response ${res.statusCode} ${res.statusMessage} from S3`));
          }

          logger.log('Artifact %s of resource %s is uploading to %s',
            artifactPath, logicalId, s3url);

          request(options.sign({
            method: 'PUT',
            service: 's3',
            path,
            body,
            signQuery: true,
          }), res => {
            res.on('data', () => {})
              .on('end', () => {
                Properties[propertyName] = s3url;
                callback(null);
              });
          }).on('error', err => callback(err))
            .end(body);
        }).on('error', err => callback(err))
          .end();
      }
    });

    parallel(tasks, err => {
      if (err) {
        return callback(err);
      }

      callback(null, template);
    });
  });
}

function packFunction(pkgDir, options, callback) {
  readJson(join(pkgDir, 'package.json'), (err, pkgJson) => {
    if (err) {
      return callback(err);
    }

    pack({
      pkgJson,
      pkgDir,
      cacheBaseDir: `${homedir()}/.cfn-package`,
    }, (err, result) => {
      if (err) {
        return callback(err);
      }

      const { thumbprint, zip } = result;

      zip.generateAsync({
        type: 'nodebuffer',
        platform: process.platform,
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9,
        },
      }).then(data => callback(null, data, thumbprint))
        .catch(err => callback(err));
    });
  });
}

function packDirectory(dir, options, callback) {
  zipFiles('**', {
    cwd: dir,
    dot: true,
    nodir: true,
    nosort: true,
    zip: new JSZip(),
  }, (err, zip) => {
    if (err) {
      return callback(err);
    }

    zip.generateAsync({
      type: 'nodebuffer',
      platform: process.platform,
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    }).then(data => callback(null, data))
      .catch(err => callback(err));
  });
}

function md5(data) {
  const md5 = createHash('md5');
  md5.update(data);
  return md5.digest('hex');
}

/*
 * Exports.
 */
exports.packageTemplate = packageTemplate;
