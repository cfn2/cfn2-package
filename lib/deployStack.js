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

    const [{ Parameters }] = data.Stacks;

    Parameters.forEach(p => delete p.ResolvedValue);

      return updateStack({
      Parameters,
      ...options,
    }, callback);
  });
}

function createStack(options, callback) {
  const {
    StackName,
    TemplateBody,
    Capabilities,
    NotificationARNs,
    logger,
  } = options;

  const cloudformation = new AWS.CloudFormation();

  const params = {
    StackName,
    TemplateBody,
    Capabilities,
    NotificationARNs,
  };

  cloudformation.createStack(params, (err, data) => {
    if (err) {
      return callback(err);
    }

    logger.log('Stack %s is created', StackName);

    callback(null, data.StackId);
  });
}

function updateStack(options, callback) {
  const {
    StackName,
    TemplateBody,
    Capabilities,
    NotificationARNs,
    Parameters,
    logger,
  } = options;

  const cloudformation = new AWS.CloudFormation();

  const params = {
    StackName,
    TemplateBody,
    Capabilities,
    NotificationARNs,
    Parameters,
  };

  cloudformation.updateStack(params, (err, data) => {
    if (err) {
      return callback(err);
    }

    logger.log('Stack %s is updated', StackName);

    callback(null, data.StackId);
  });
}

exports.deployStack = deployStack;
