var nodemiral = require('nodemiral');
var taskLists = require('./taskLists');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var uuid = require('uuid');

module.exports = Actions;

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

  console.log('Bundling Started: ' + this.config.app);
  exec(command, options, function(err, stdout, stderr) {
    if(err) {
      console.error('Bundling Error: ', err.message);
      console.error('-------------------STDOUT-------------------')
      console.error(stdout)
      console.error('-------------------STDERR-------------------')
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

Actions.prototype.logs = function() {
  var tailOptions = process.argv.slice(3).join(" ");
  var command = 'sudo tail ' + tailOptions + ' /var/log/upstart/meteor.log';
  var options = {
    onStdout: printOut,
    onStderr: printErr
  };

  this.session.execute(command, options);

  function printErr(data) {
    process.stderr.write(data.toString());
  }

  function printOut(data) {
    process.stdout.write(data.toString());
  }
};

Actions.init = function() {
  var destMupJson = path.resolve('mup.json');
  var destSettingsJson = path.resolve('settings.json');

  if(fs.existsSync(destMupJson) || fs.existsSync(destSettingsJson)) {
    console.error('A Project Already Exists');
    process.exit(1);
  }

  var exampleMupJson = path.resolve(__dirname, '../example/mup.json');
  var exampleSettingsJson = path.resolve(__dirname, '../example/settings.json');

  copyFile(exampleMupJson, destMupJson);
  copyFile(exampleSettingsJson, destSettingsJson);

  console.log('Empty Project Initialized!');

  function copyFile(src, dest) {
    var content = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, content);
  }
};