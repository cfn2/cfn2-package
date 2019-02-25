const test = require('tape');
const { spawn } = require('child_process');

const command = './bin/cli';

test('test deploy', t => {
  t.plan(1);

  const args = [
    '--s3-bucket',
    'node-tmp',
    '--s3-prefix',
    'cfn-package/test',
    '--template-file',
    `${__dirname}/template.yaml`,
    '--deploy',
    '--stack-name',
    'cfn-package-test',
    '--capabilities',
    'CAPABILITY_AUTO_EXPAND,CAPABILITY_IAM',
  ];

  const child = spawn(command, args, {
    stdio: 'inherit',
  });

  child.on('exit', code => {
    t.equal(code, 0);
  });
});
