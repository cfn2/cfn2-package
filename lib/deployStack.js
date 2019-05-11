const AWS = require('aws-sdk');
const { getRequiredCapabilities } = require('./getRequiredCapabilities');

function deployStack(options, callback) {
  const {
    StackName,
    Template,
    Capabilities,
    NotificationARNs,
  } = options;

  const options2 = { ...options };

  if (typeof NotificationARNs === 'string') {
    options2.NotificationARNs = [NotificationARNs];
  }

  options2.TemplateBody = JSON.stringify(Template, null, 2);
  options2.Capabilities = getRequiredCapabilities(Capabilities, Template);

  const cloudformation = new AWS.CloudFormation();

  const params = {
    StackName,
  };

  cloudformation.describeStacks(params, (err, data) => {
    if (err) {
      if (err.statusCode !== 400) {
        return callback(err);
      }

      return createStack(options2, callback);
    }

    const [{ Parameters }] = data.Stacks;

    Parameters.forEach(p => delete p.ResolvedValue);

    options2.Parameters = Parameters;

    return updateStack(options2, callback);
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
