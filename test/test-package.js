const test = require('tape');
const { spawn } = require('child_process');

const command = './bin/cli';

test('test package', t => {
  t.plan(1);

  const args = [
    '--s3-bucket',
    'node-tmp',
    '--s3-prefix',
    'cfn-package/test',
    '--template-file',
    `${__dirname}/template.yaml`,
    '--output-template-file',
    's3://node-tmp/cfn-package/test/output-template.yaml',
  ];

  const child = spawn(command, args, {
    stdio: 'inherit',
  });

  child.on('exit', code => {
    t.equal(code, 0);
  });
});
