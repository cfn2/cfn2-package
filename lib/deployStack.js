const AWS = require('aws-sdk');

function deployStack(options, callback) {
  const {
    StackName,
  } = options;

  const cloudformation = new AWS.CloudFormation();

  const params = {
    StackName,
  };

  cloudformation.describeStacks(params, (err, data) => {
    if (err) {
      if (err.statusCode !== 400) {
        return callback(err);
      }

      return createStack(options, callback);
    }

    return updateStack(options, callback);
  });
}

function createStack(options, callback) {
  const {
    StackName,
    TemplateBody,
    Capabilities,
    logger,
  } = options;

  const cloudformation = new AWS.CloudFormation();

  const params = {
    StackName,
    TemplateBody,
    Capabilities,
  };

  cloudformation.createStack(params, (err, data) => {
    if (err) {
      return callback(err);
    }

    logger.log('Stack %s is created', StackName);

    callback(null);
  });
}

function updateStack(options, callback) {
  const {
    StackName,
    TemplateBody,
    Capabilities,
    logger,
  } = options;

  const cloudformation = new AWS.CloudFormation();

  const params = {
    StackName,
    TemplateBody,
    Capabilities,
  };

  cloudformation.updateStack(params, (err, data) => {
    if (err) {
      return callback(err);
    }

    logger.log('Stack %s is updated', StackName);

    callback(null);
  });
}

exports.deployStack = deployStack;
