const yargs = require('yargs');
const { showError } = require('./showError');
const { packageTemplate } = require('./packageTemplate');
const { makeSigner } = require('aws4-with-assume-role');
const { cyan } = require('chalk');
const { writeFile } = require('fs');
const { extname } = require('path');
const yaml = require('js-yaml');

const logger = {
  log(format, ...args) {
    args = args.map(arg => cyan(arg));

    console.error(format, ...args);
  }
};

function main(callback) {
  const argv = yargs
    .options({
      'template-file': {
        demandOption: true,
        describe: 'A path of a template file',
        type: 'string',
      },
      's3-bucket': {
        demandOption: true,
        describe: 'A name of S3 bucket where artifacts are uploaded',
        type: 'string',
      },
      's3-prefix': {
        describe: 'A prefix name of S3 where artifacts are uploaded',
        type: 'string',
      },
      'output-template-file': {
        describe: 'A path of an output template file',
        type: 'string',
      },
      profile: {
        describe: 'A profile of AWS CLI',
        type: 'string',
      },
      region: {
        describe: 'AWS region',
        type: 'string',
      },
      verbose: {
        alias: 'v',
        describe: 'Verbose mode',
        type: 'boolean',
      },
    })
    .version()
    .help()
    .argv;

  makeSigner({
    profile: argv.profile,
    region: argv.region,
  }, (err, sign) => {
    if (err) {
      return callback(err);
    }

    packageTemplate({
      bucket: argv['s3-bucket'],
      prefix: argv['s3-prefix'],
      templateFile: argv['template-file'],
      sign,
      logger,
    }, (err, template) => {
      if (err) {
        return callback(err);
      }

      const outputTemplateFile = argv['output-template-file'];

      if (!outputTemplateFile) {
        console.log(JSON.stringify(template, null, 2));
      } else {
        writeTemplate(outputTemplateFile, template, err => {
          if (err) {
            return callback(err);
          }

          logger.log('Packaged template %s is created', outputTemplateFile);
        });
      }
    });
  });
}

function writeTemplate(path, template, callback) {
  const ext = extname(path);

  if (ext === '.yml' || ext === '.yaml') {
    writeFile(path, yaml.safeDump(template), callback);
  } else {
    writeFile(path, JSON.stringify(template, null, 2), callback);
  }
}

main(err => {
  if (err) {
    showError(err);
    process.exit(1);
  }
});
