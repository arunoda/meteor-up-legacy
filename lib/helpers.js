var exec = require('child_process').exec;

exports.printHelp = function() {
  console.error('\nSyntax: mup <action> [--<parameter>]');
  console.error('');
  console.error('\nValid Actions (mandatory)');
  console.error('---------------------------');
  console.error('init                   - Initialize a Meteor Up project');
  console.error('setup                  - Setup the server');
  console.error('');
  console.error('deploy                 - Deploy app to server');
  console.error('reconfig               - Reconfigure the server and restart');
  console.error('');
  console.error('logs [-f --tail=all]   - Access logs');
  console.error('');
  console.error('start                  - Start your app instances');
  console.error('stop                   - Stop your app instances');
  console.error('restart                - Restart your app instances');
  console.error('\nAvailable Parameters (optional)');
  console.error('---------------------------------');
  console.error('--config=mup-prod.json - Specify the deployment configuration');
  console.error('                         Default value: mup.json');
  console.error('--settings=file.json   - Specify the Meteor.settings file');
  console.error('                         Default value: settings.json');
};
