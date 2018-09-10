# cfn-package

Package template files of CloudFormation.

## Installation

```
npm i -g cfn-package
```

## CLI

```
#
# Package and upload local artifacts.
#
$ cfn-package --template-file path/to/template \
              --output-template-file path/to/output \
              --s3-bucket bucket-name \
              --s3-prefix prefix

#
# Update functions directly in a existing stack of the CloudFormation.
# In this case, Both --update-functions and --stack-name must be specified.
#
$ cfn-package --template-file path/to/template \
              --s3-bucket bucket-name \
              --s3-prefix prefix \
              --update-functions --stack-name MyStack
```

See [aws cloudformation package](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/package.html#options) for descriptions of options.

If a local artifact of a template file is a project directory of node.js, the `cfn-package` command packs the directory with using [npm-lambda-pack](https://github.com/nak2k/node-npm-lambda), and uploads the package that is packed for production.

## License

MIT
