const IAMResourceTypes = [
  'AWS::IAM::AccessKey',
  'AWS::IAM::Group',
  'AWS::IAM::InstanceProfile',
  'AWS::IAM::Policy',
  'AWS::IAM::Role',
  'AWS::IAM::User',
  'AWS::IAM::UserToGroupAddition',
];

function getRequiredCapabilities(capabilities = [], template) {
  if (typeof capabilities === 'string') {
    capabilities = capabilities.split(',');
  }

  const {
    Transform,
    Resources,
  } = template;

  /*
   * CAPABILITY_AUTO_EXPAND
   */
  if (Transform) {
    if (Transform === 'AWS::Serverless-2016-10-31'
      || (Array.isArray(Transform) && Transform.includes('AWS::Serverless-2016-10-31'))) {
      capabilities.push('CAPABILITY_AUTO_EXPAND');
    }
  }

  /*
   * CAPABILITY_IAM, CAPABILITY_NAMED_IAM
   */
  Object.values(Resources).forEach(resource => {
    const {
      Type,
      Properties,
    } = resource;

    if (IAMResourceTypes.includes(Type)) {
      capabilities.push(
        Properties.Name ? 'CAPABILITY_NAMED_IAM' : 'CAPABILITY_IAM'
      );
    } else if (Type === 'AWS::Serverless::Function') {
      const { Policies, Role } = Properties;

      if (Policies && !Role) {
        capabilities.push('CAPABILITY_IAM');
      }
    }
  });

  return capabilities.length ? [...new Set(capabilities)] : undefined;
}

exports.getRequiredCapabilities = getRequiredCapabilities;
