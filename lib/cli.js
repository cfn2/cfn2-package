const yargs = require('yargs');
const { showError } = require('./showError');
const { packageTemplate } = require('@cfn2/package-core');
const { cyan } = require('chalk');
const { deployStack } = require('./deployStack');
const { writeTemplate } = require('./writeTemplate');
const AWS = require('aws-sdk');
const { openArn } = require('opn-arn');
const { openStack } = require('./openStack');
const { basename } = require('path');

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
      open: {
        describe: 'Open the AWS Management Console',
        type: 'boolean',
      },
      'parameter-overrides': {
        describe: 'Parameters of a stack',
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
    templateFile,
    s3Bucket,
    s3Prefix,
    deploy,
    capabilities,
    open,
    parameterOverrides,
  } = argv;

  let {
    outputTemplateFile,
    stackName,
  } = argv;

  if (!stackName) {
    const { npm_package_name } = process.env;

    if (npm_package_name) {
      stackName = npm_package_name.replace(/^@[^\/]+\//, '');
    }
  }

  if (!stackName) {
    if (updateFunctions) {
      return callback(new Error('The option --stack-name also must be specified if use the option --update-functions'));
    }

    if (deploy) {
      return callback(new Error('The option --stack-name also must be specified if use the option --deploy'));
    }
  }

  if (!outputTemplateFile && (deploy || open)) {
    const outputFileName = 'output-' + basename(templateFile).replace(/\.(json|ya?ml)$/, '');
    outputTemplateFile = `s3://${s3Bucket}/${s3Prefix}/${outputFileName}`;
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

  const tasks = [
    next => () =>
      packageTemplate({
        bucket: s3Bucket,
        prefix: s3Prefix,
        templateFile,
        logger,
        updateFunctions,
        stackName,
      }, next)
  ];

  if (updateFunctions) {
    return runTasks(tasks, callback);
  }

  if (outputTemplateFile) {
    tasks.push(next => template => {
      writeTemplate(outputTemplateFile, template, err => {
        if (err) {
          return next(err);
        }

        logger.log('Packaged template %s is created', outputTemplateFile);

        next(null, template);
      });
    });
  } else if (!deploy) {
    tasks.push(next => template => {
      console.log(JSON.stringify(template, null, 2));

      next(null, template);
    });
  }

  if (deploy) {
    tasks.push(next => template => {
      deployStack({
        StackName: stackName,
        Template: template,
        Parameters: parameterOverrides &&
          parameterOverrides.map(p => {
            const [k, v] = p.split('=');
            return {
              ParameterKey: k,
              ParameterValue: v,
            };
          }),
        Capabilities: capabilities,
        NotificationARNs: process.env.CFN2_NOTIFICATION_ARN,
        logger,
      }, next);
    });
  }

  if (open) {
    if (deploy) {
      tasks.push(next => arn => {
        openArn(arn, next);
      });
    } else if (outputTemplateFile.startsWith('s3:')) {
      tasks.push(next => () => {
        openStack({
          StackName: stackName,
          TemplateURL: outputTemplateFile,
        }, next);
      });
    }
  }

  runTasks(tasks, callback);
}

function runTasks(tasks, callback) {
  tasks.reduceRight(
    (next, fn) => fn(
      (err, ...result) => err ? callback(err) : next(...result)
    ),
    () => callback(null)
  )();
}

main(err => {
  if (err) {
    showError(err);
    process.exit(1);
  }
});
