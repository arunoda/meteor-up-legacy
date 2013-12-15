var nodemiral = require('nodemiral');
var taskLists = require('./taskLists');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var uuid = require('uuid');
require('colors');

module.exports = Actions;

function Actions(config, cwd) {
  this.cwd = cwd;
  this.config = config;
  this.sessions = this._createSession(config);

  //get settings.json into env
  var setttingsJsonPath = path.resolve(this.cwd, 'settings.json');
  if(fs.existsSync(setttingsJsonPath)) {
    this.config.env['METEOR_SETTINGS'] = "'" + JSON.stringify(require(setttingsJsonPath)) + "'";
  }
}

Actions.prototype._createSession = function(config) {
  var sessions = [];
  var options = {
    ssh: {'StrictHostKeyChecking': 'no', 'UserKnownHostsFile': '/dev/null'}
  };

  config.servers.forEach(function(server) {
    var host = server.host;
    var auth = {username: server.username};
    if(server.pem) {
      auth.pem = fs.readFileSync(path.resolve(server.pem), 'utf8');
    } else {
      auth.password = server.password;
    }

    sessions.push(nodemiral.session(host, auth, options));
  });

  return sessions;
};

Actions.prototype.setup = function() {
  var taskList = taskLists.setup(this.config.setupMongo);
  taskList.run(this.sessions);
};

Actions.prototype.deploy = function() {
  var self = this;
  var bundlePath = path.resolve('/tmp/', uuid.v4() + '.tar.gz');
  var command = "meteor bundle " + bundlePath;
  var options = {cwd: this.config.app};
  var deployCheckWaitTime = this.config.deployCheckWaitTime;

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
      var taskList = taskLists.deploy(bundlePath, self.config.env, deployCheckWaitTime);
      taskList.run(self.sessions, afterCompleted);
    }
  });

  function afterCompleted(summeryMap) {
    fs.unlinkSync(bundlePath); 
  }
};

Actions.prototype.reconfig = function() {
  var taskList = taskLists.reconfig(this.config.env);
  taskList.run(this.sessions);
};

Actions.prototype.logs = function() {
  var tailOptions = process.argv.slice(3).join(" ");
  var command = 'sudo tail ' + tailOptions + ' /var/log/upstart/meteor.log';

  this.sessions.forEach(function(session) {
    var hostPrefix = '[' + session._host + '] ';
    var options = {
      onStdout: function(data) {
        process.stdout.write(hostPrefix + data.toString());
      },
      onStderr: function(data) {
        process.stderr.write(hostPrefix + data.toString());
      }
    };

    session.execute(command, options);
  });
};

Actions.init = function() {
  var destMupJson = path.resolve('mup.json');
  var destSettingsJson = path.resolve('settings.json');

  if(fs.existsSync(destMupJson) || fs.existsSync(destSettingsJson)) {
    console.error('A Project Already Exists'.bold.red);
    process.exit(1);
  }

  var exampleMupJson = path.resolve(__dirname, '../example/mup.json');
  var exampleSettingsJson = path.resolve(__dirname, '../example/settings.json');

  copyFile(exampleMupJson, destMupJson);
  copyFile(exampleSettingsJson, destSettingsJson);

  console.log('Empty Project Initialized!'.bold.green);

  function copyFile(src, dest) {
    var content = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, content);
  }
};