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

exports.getRequiredCapabilities = getRequiredCapabilities;
