var exec = require('child_process').exec;

exports.checkSshPassExists = function(callback) {
  exec('sshpass -V', function(err, stdout, stderr) {
    if(err) {
      callback(false);
    } else {
      callback(true);
    }
  });
};

exports.printHelp = function() {
  console.error('\nValid Actions');
  console.error('-------------');
  console.error('init           - initialize a Meteor-Up project');
  console.error('setup          - setup the server');
  console.error('deploy         - deploy app to server');
  console.error('logs [-f -n ]  - access logs');
};