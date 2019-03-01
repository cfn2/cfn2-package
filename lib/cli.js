const yargs = require('yargs');
const { showError } = require('./showError');
const { packageTemplate } = require('@cfn2/package-core');
const { cyan } = require('chalk');
const { writeFile } = require('fs');
const { extname } = require('path');
const yaml = require('js-yaml');
const { deployStack } = require('./deployStack');

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
        describe: 'A path of a template file',
        type: 'string',
        default: 'template.yaml',
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
      'update-functions': {
        describe: 'Update functions directly',
        type: 'boolean',
      },
      'stack-name': {
        describe: 'A stack name',
        type: 'string',
      },
      deploy: {
        describe: 'Deploy after package',
        type: 'boolean',
      },
      capabilities: {
        type: 'string',
      },
    })
    .version()
    .help()
    .argv;

  const {
    profile,
    region,
    updateFunctions,
    stackName,
    templateFile,
    outputTemplateFile,
    s3Bucket,
    s3Prefix,
    deploy,
    capabilities,
  } = argv;

  if (!stackName) {
    if (updateFunctions) {
      return callback(new Error('The option --stack-name also must be specified if use the option --update-functions'));
    }

    if (deploy) {
      return callback(new Error('The option --stack-name also must be specified if use the option --deploy'));
    }
  }

  if (profile) {
    const creds = new AWS.SharedIniFileCredentials({ profile });
    AWS.config.credentials = creds;
  }

  if (region) {
    AWS.config.update({
      region,
    });
  }

  packageTemplate({
    bucket: s3Bucket,
    prefix: s3Prefix,
    templateFile,
    logger,
    updateFunctions,
    stackName,
  }, (err, template) => {
    if (err) {
      return callback(err);
    }

    if (updateFunctions) {
      return callback(null);
    }

    if (!outputTemplateFile) {
      if (!deploy) {
        console.log(JSON.stringify(template, null, 2));
      }

      return deployTask();
    } else {
      writeTemplate(outputTemplateFile, template, err => {
        if (err) {
          return callback(err);
        }

        logger.log('Packaged template %s is created', outputTemplateFile);

        return deployTask();
      });
    }

    function deployTask() {
      if (!deploy) {
        return callback(null);
      }

      deployStack({
        StackName: stackName,
        TemplateBody: JSON.stringify(template, null, 2),
        Capabilities: getRequiredCapabilities(capabilities, template),
        logger,
      }, callback);
    }
  });
}

function getRequiredCapabilities(capabilities = [], template) {
  if (typeof capabilities === 'string') {
    capabilities = capabilities.split(',');
  }

  const { Transform } = template;

  if (Transform) {
    if (Transform === 'AWS::Serverless-2016-10-31'
      || (Array.isArray(Transform) && Transform.includes('AWS::Serverless-2016-10-31'))) {
      capabilities.push('CAPABILITY_AUTO_EXPAND');
    }
  }

  return capabilities.length ? [...new Set(capabilities)] : undefined;
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
