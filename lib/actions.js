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
var async = require('async');
var buildApp = require('./build.js');
var os = require('os');
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

  config.servers.forEach(function(server) {
    var host = server.host;
    var auth = {username: server.username};

    if(server.pem) {
      auth.pem = fs.readFileSync(path.resolve(server.pem), 'utf8');
    } else {
      auth.password = server.password;
    }

    var nodemiralOptions = {
      ssh: server.sshOptions,
      keepAlive: true
    };

    if(!sessionsMap[server.os]) {
      sessionsMap[server.os] = {
        sessions: [],
        taskListsBuilder:require('./taskLists')(server.os)
      };
    }

    var session = nodemiral.session(host, auth, nodemiralOptions);
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
};

Actions.prototype._executePararell = function(actionName, args) {
  var self = this;
  var sessionInfoList = _.values(self.sessionsMap);
  async.map(
    sessionInfoList,
    function(sessionsInfo, callback) {
      var taskList = sessionsInfo.taskListsBuilder[actionName]
        .apply(sessionsInfo.taskListsBuilder, args);
      taskList.run(sessionsInfo.sessions, function(summaryMap) {
        callback(null, summaryMap);
      });
    },
    whenAfterCompleted
  );
};

Actions.prototype.setup = function() {
  this._showKadiraLink();
  this._executePararell("setup", [this.config]);
};

Actions.prototype.deploy = function() {
  var self = this;
  self._showKadiraLink();

  var buildLocation = path.resolve(os.tmpdir(), uuid.v4());
  var bundlePath = path.resolve(buildLocation, 'bundle.tar.gz');

  // spawn inherits env vars from process.env
  // so we can simply set them like this
  process.env.BUILD_LOCATION = buildLocation;

  var deployCheckWaitTime = this.config.deployCheckWaitTime;
  var appName = this.config.appName;
  var appPath = this.config.app;
  var enableUploadProgressBar = this.config.enableUploadProgressBar;
  var meteorBinary = this.config.meteorBinary;

  console.log('Building Started: ' + this.config.app);
  buildApp(appPath, meteorBinary, buildLocation, function(err) {
    if(err) {
      process.exit(1);
    } else {
      var sessionsData = [];
      _.forEach(self.sessionsMap, function (sessionsInfo) {
        var taskListsBuilder = sessionsInfo.taskListsBuilder;
        _.forEach(sessionsInfo.sessions, function (session) {
          sessionsData.push({
            taskListsBuilder: taskListsBuilder,
            session: session
          });
        });
      });

      async.mapSeries(
        sessionsData,
        function (sessionData, callback) {
          var session = sessionData.session;
          var taskListsBuilder = sessionData.taskListsBuilder;
          var env = _.extend({}, self.config.env, session._serverConfig.env);
          var taskList = taskListsBuilder.deploy(
            bundlePath, env,
            deployCheckWaitTime, appName, enableUploadProgressBar);
          taskList.run(session, function (summaryMap) {
            callback(null, summaryMap);
          });
        },
        whenAfterDeployed(buildLocation)
      );
    }
  });
};

Actions.prototype.reconfig = function() {
  var self = this;
  var sessionInfoList = [];
  for(var os in self.sessionsMap) {
    var sessionsInfo = self.sessionsMap[os];
    sessionsInfo.sessions.forEach(function(session) {
      var env = _.extend({}, self.config.env, session._serverConfig.env);
      var taskList = sessionsInfo.taskListsBuilder.reconfig(
        env, self.config.appName);
      sessionInfoList.push({
        taskList: taskList,
        session: session
      });
    });
  }

  async.mapSeries(
    sessionInfoList,
    function(sessionInfo, callback) {
      sessionInfo.taskList.run(sessionInfo.session, function(summaryMap) {
        callback(null, summaryMap);
      });
    },
    whenAfterCompleted
  );
};

Actions.prototype.restart = function() {
  this._executePararell("restart", [this.config.appName]);
};

Actions.prototype.stop = function() {
  this._executePararell("stop", [this.config.appName]);
};

Actions.prototype.start = function() {
  this._executePararell("start", [this.config.appName]);
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

function storeLastNChars(vars, field, limit, color) {
  return function(data) {
    vars[field] += data.toString();
    if(vars[field].length > 1000) {
      vars[field] = vars[field].substring(vars[field].length - 1000);
    }
  };
}

function whenAfterDeployed(buildLocation) {
  return function(error, summaryMaps) {
    rimraf.sync(buildLocation);
    whenAfterCompleted(error, summaryMaps);
  };
}

function whenAfterCompleted(error, summaryMaps) {
  var errorCode = error || haveSummaryMapsErrors(summaryMaps) ? 1 : 0;
  process.exit(errorCode);
}

function haveSummaryMapsErrors(summaryMaps) {
  return _.some(summaryMaps, hasSummaryMapErrors);
}

function hasSummaryMapErrors(summaryMap) {
  return _.some(summaryMap, function (summary) {
    return summary.error;
  });
}
