var nodemiral = require('nodemiral');
var taskLists = require('./taskLists');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var uuid = require('uuid');

module.exports = function(session, cwd) {
  return new Actions(session, cwd);
};

function Actions(config, cwd) {
  this.cwd = cwd;
  this.config = config;
  
  // build the session
  var options = {
    ssh: {'StrictHostKeyChecking': 'no', 'UserKnownHostsFile': '/dev/null'}
  };
  var host = config.server.host;
  var auth = {username: config.server.username};

  if(config.server.pem) {
    auth.pem = fs.readFileSync(path.resolve(config.server.pem), 'utf8');
  } else {
    auth.password = config.server.password;
  }

  this.session = nodemiral.session(host, auth, options);
}

Actions.prototype.setup = function() {
  var taskList = taskLists.setup(this.config.setupMongo);
  taskList.run(this.session);
};

Actions.prototype.deploy = function() {
  var self = this;
  var bundlePath = path.resolve('/tmp/', uuid.v4() + '.tar.gz');
  var command = "meteor bundle " + bundlePath;
  var options = {cwd: this.config.app};

  console.log('\n  Bundling...');
  exec(command, options, function(err, stdout, stderr) {
    if(err) {
      console.error('  Bundling Error: ', err.message);
      console.error('=======================STDOUT=======================')
      console.error(stdout)
      console.error('=======================STDERR=======================')
      console.error(stderr);
      process.exit(1);
    } else {
      var taskList = taskLists.deploy(bundlePath, self.cwd, self.config.env);
      taskList.run(self.session, afterCompleted);
    }
  });

  function afterCompleted(summeryMap) {
    fs.unlinkSync(bundlePath); 
  }
};