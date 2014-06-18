var nodemiral = require('nodemiral');
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
  this.sessionsMap = this._createSessionsMap(config);

  //get settings.json into env
  var setttingsJsonPath = path.resolve(this.cwd, 'settings.json');
  if(fs.existsSync(setttingsJsonPath)) {
    this.config.env['METEOR_SETTINGS'] = "'" + JSON.stringify(require(setttingsJsonPath)) + "'";
  }
}

Actions.prototype._createSessionsMap = function(config) {
  var sessionsMap = {};
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
      for(var key in server.sshOptions) {
        options.ssh[key] = server.sshOptions[key];
      }
    }

    if(!sessionsMap[server.os]) {
      sessionsMap[server.os] = {
        sessions: [],
        taskListsBuilder:require('./taskLists')(server.os)
      };
    }

    var session = nodemiral.session(host, auth, options);
    sessionsMap[server.os].sessions.push(session);
  });

  return sessionsMap;
};

Actions.prototype.setup = function() {
  var self = this;
  var taskListRunner = nodemiral.taskListsRunner('Setup');
  for(var os in self.sessionsMap) {
    var sessionsInfo = self.sessionsMap[os];
    var taskList = sessionsInfo.taskListsBuilder.setup(
      self.config.setupMongo, self.config.setupNode, self.config.nodeVersion,
      self.config.setupPhantom, self.config.appName);
    taskListRunner.add(taskList, sessionsInfo.sessions);
  }

  taskListRunner.run();
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
      console.error('-------------------STDOUT-------------------'.bold);
      console.error(vars.stdout);
      console.error('-------------------STDERR-------------------'.bold.red);
      console.error(vars.stderr.red);
      process.exit(1);
    } else {
      var taskListRunner = nodemiral.taskListsRunner('Deploy');
      for(var os in self.sessionsMap) {
        var sessionsInfo = self.sessionsMap[os];
        var taskList = sessionsInfo.taskListsBuilder.deploy(
          bundlePath, self.config.env,
          deployCheckWaitTime, appName, self.config.binaryNpmModules);
        taskListRunner.add(taskList, sessionsInfo.sessions);
      }

      taskListRunner.run();
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
  var self = this;
  var taskListRunner = nodemiral.taskListsRunner('Deploy');
  for(var os in self.sessionsMap) {
    var sessionsInfo = self.sessionsMap[os];
    var taskList = sessionsInfo.taskListsBuilder.reconfig(
      this.config.env, this.config.appName);
    taskListRunner.add(taskList, sessionsInfo.sessions);
  }

  taskListRunner.run();
};

Actions.prototype.logs = function() {
  var self = this;
  var tailOptions = process.argv.slice(3).join(" ");

  for(var os in self.sessionsMap) {
    var sessionsInfo = self.sessionsMap[os];
    sessionsInfo.sessions.forEach(function(session) {
      var hostPrefix = '[' + session._host + '] ';
      var options = {
        onStdout: function(data) {
          process.stdout.write(hostPrefix + data.toString());
        },
        onStderr: function(data) {
          process.stderr.write(hostPrefix + data.toString());
        }
      };

      if(os == 'linux') {
        var command = 'sudo tail ' + tailOptions + ' /var/log/upstart/' + self.config.appName + '.log';
      } else if(os == 'sunos') {
        var command = 'sudo tail ' + tailOptions +
          ' /var/svc/log/site-' + self.config.appName + '\\:default.log';
      }
      session.execute(command, options);
    });
  }

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
