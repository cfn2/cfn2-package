const AWS = require('aws-sdk');
const { opn } = require('opn-arn');
const { URL } = require('url');

function openStack(options, callback) {
  const {
    StackName,
    TemplateURL,
  } = options;

  const urlObj = new URL(TemplateURL);
  const {
    host,
    pathname,
  } = urlObj;

  options.TemplateURL = `https://${host}.s3.amazonaws.com${pathname}`;

  if (!StackName) {
    return openCreateLink(options, callback);
  }

  const cloudformation = new AWS.CloudFormation();

  const params = {
    StackName,
  };

  cloudformation.describeStacks(params, (err, data) => {
    if (err) {
      if (err.statusCode !== 400) {
        return callback(err);
      }

      return openCreateLink(options, callback);
    }

    return openUpdateLink({
      ...options,
      StackId: data.Stacks[0].StackId,
    }, callback);
  });
}

function openCreateLink(options, callback) {
  const {
    StackName = '',
    TemplateURL,
  } = options;

  const { region } = AWS.config;

  opn(`https://${region}.console.aws.amazon.com/cloudformation/home#/stacks/create/review?templateURL=${encodeURIComponent(TemplateURL)}&stackName=${StackName}`, { wait: false })
    .then(() => {
      callback(null);
    })
    .catch(err => {
      callback(err);
    });
}

function openUpdateLink(options, callback) {
  const {
    StackId,
    TemplateURL,
  } = options;

  const { region } = AWS.config;

  opn(`https://${region}.console.aws.amazon.com/cloudformation/home#/stacks/${encodeURIComponent(StackId)}/update?templateURL=${encodeURIComponent(TemplateURL)}`, { wait: false })
    .then(() => {
      callback(null);
    })
    .catch(err => {
      callback(err);
    });
}

exports.openStack = openStack;
