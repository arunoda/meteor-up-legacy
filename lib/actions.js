var nodemiral = require('nodemiral');
var taskLists = require('./taskLists');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var uuid = require('uuid');
var format = require('util').format;
var extend = require('util')._extend;
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

    if(server.sshOptions) {
      for (var key in server.sshOptions) {
        options.ssh[key] = server.sshOptions[key];
      }
    }
    sessions.push(nodemiral.session(host, auth, options));
  });

  return sessions;
};

Actions.prototype.setup = function() {
  var taskList = taskLists.setup(this.config.setupMongo, this.config.setupNode, this.config.nodeVersion, this.config.setupPhantom, this.config.appName);
  taskList.run(this.sessions);
};

Actions.prototype.deploy = function() {
  var self = this;
  var bundlePath = path.resolve(format('/tmp/%s.tar.gz', uuid.v4()));
  var command = format("%s bundle %s", this.config.meteorBinary, bundlePath);
  var options = {cwd: this.config.app};
  var deployCheckWaitTime = this.config.deployCheckWaitTime;
  var appName = this.config.appName;

  console.log('Bundling Started: ' + this.config.app);
  var vars = {
    stdout: "",
    stderr: "",
    error: ""
  };

  var bash = spawn("bash", ["-c", command], options);
  bash.stdout.on('data', storeLastNChars(vars, "stdout", 1000));
  bash.stderr.on('data', storeLastNChars(vars, "stderr", 1000));
  bash.on('error', function(err) {
    vars.error = err.message;
  });
  bash.on('close', function(code) {
    //clear callback
    bash.stdout.removeAllListeners('data');
    bash.stderr.removeAllListeners('data');
    bash.removeAllListeners('error');
    bash.removeAllListeners('close');

    if(code != 0) {
      console.error(format('Bundling Error: code=%s, error:%s', code, vars.error));
      console.error('-------------------STDOUT-------------------')
      console.error(vars.stdout)
      console.error('-------------------STDERR-------------------')
      console.error(vars.stderr);
      process.exit(1);
    } else {
      var taskList = taskLists.deploy(bundlePath, self.config.env, 
        deployCheckWaitTime, appName, self.config.binaryNpmModules);
      taskList.run(self.sessions, afterCompleted);
    }
  });

  function storeLastNChars(vars, field, limit, color) {
    return function(data) {
      vars[field] += data.toString();
      if(vars[field].length > 1000) {
        vars[field] = vars[field].substring(vars[field].length - 1000);
      }
    }
  }

  function afterCompleted(summeryMap) {
    fs.unlinkSync(bundlePath); 
  }
};

Actions.prototype.reconfig = function() {
  var taskList = taskLists.reconfig(this.config.env, this.config.appName);
  taskList.run(this.sessions);
};

Actions.prototype.logs = function() {
  var tailOptions = process.argv.slice(3).join(" ");
  var command = 'sudo tail ' + tailOptions + ' /var/log/upstart/' + this.config.appName + '.log';

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
