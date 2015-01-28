var nodemiral = require('nodemiral');
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var uuid = require('uuid');
var format = require('util').format;
var extend = require('util')._extend;
var _ = require('underscore');
require('colors');

module.exports = Actions;

function Actions(config, cwd) {
  this.cwd = cwd;
  this.config = config;
  this.sessionsMap = this._createSessionsMap(config);

  //get settings.json into env
  var setttingsJsonPath = path.resolve(this.cwd, 'settings.json');
  if(fs.existsSync(setttingsJsonPath)) {
    this.config.env['METEOR_SETTINGS'] = JSON.stringify(require(setttingsJsonPath));
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
    session._serverConfig = server;
    sessionsMap[server.os].sessions.push(session);
  });

  return sessionsMap;
};

var kadiraRegex = /^meteorhacks:kadira/m;
Actions.prototype._showKadiraLink = function() {
  var versionsFile = path.join(this.config.app, '.meteor/versions');
  if(fs.existsSync(versionsFile)) {
    var packages = fs.readFileSync(versionsFile, 'utf-8');
    var hasKadira = kadiraRegex.test(packages);
    if(!hasKadira) {
      console.log(
        "“ Checkout " + "Kadira".bold + "!"+
        "\n  It's the best way to monitor performance of your app."+
        "\n  Visit: " + "https://kadira.io/mup".underline + " ”\n"
      );
    }
  }
}

Actions.prototype.setup = function() {
  var self = this;
  self._showKadiraLink();

  for(var os in self.sessionsMap) {
    var sessionsInfo = self.sessionsMap[os];
    var taskList = sessionsInfo.taskListsBuilder.setup(
      self.config.setupMongo, self.config.setupNode, self.config.nodeVersion,
      self.config.setupPhantom, self.config.appName);
    taskList.run(sessionsInfo.sessions);
  }
};

Actions.prototype.deploy = function() {
  var self = this;
  self._showKadiraLink();

  var buildLocation = path.resolve('/tmp', uuid.v4());
  var bundlePath = path.resolve(buildLocation, 'bundle.tar.gz');

  var options = {
    cwd: this.config.app,
  };
  // spawn inherits env vars from process.env
  // so we can simply set them like this
  process.env.BUILD_LOCATION = buildLocation;

  var buildScript = path.resolve(__dirname, 'build.sh');
  var deployCheckWaitTime = this.config.deployCheckWaitTime;
  var appName = this.config.appName;

  console.log('Building Started: ' + this.config.app);
  buildApp(buildScript, options, function(err) {
    if(err) {
      process.exit(1);
    } else {
      for(var os in self.sessionsMap) {
        var sessionsInfo = self.sessionsMap[os];
        sessionsInfo.sessions.forEach(function(session) {
          var env = _.extend({}, self.config.env, session._serverConfig.env);
          var taskList = sessionsInfo.taskListsBuilder.deploy(
            bundlePath, env,
            deployCheckWaitTime, appName);
          taskList.run(session, afterCompleted);
        });
      }
    }
  });

  function afterCompleted(summeryMap) {
    rimraf.sync(buildLocation);
  }
};

Actions.prototype.reconfig = function() {
  var self = this;
  for(var os in self.sessionsMap) {
    var sessionsInfo = self.sessionsMap[os];
    sessionsInfo.sessions.forEach(function(session) {
      var env = _.extend({}, self.config.env, session._serverConfig.env);
      var taskList = sessionsInfo.taskListsBuilder.reconfig(
        env, self.config.appName);
      taskList.run(session);
    });
  }
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


function buildApp(buildScript, options, callback) {
  var vars = {
    stdout: "",
    stderr: "",
    error: ""
  };

  var bash = spawn("bash", [buildScript], options);
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
      callback({message: vars.error});
    } else {
      callback(null);
    }
  });
}

function storeLastNChars(vars, field, limit, color) {
  return function(data) {
    vars[field] += data.toString();
    if(vars[field].length > 1000) {
      vars[field] = vars[field].substring(vars[field].length - 1000);
    }
  }
}