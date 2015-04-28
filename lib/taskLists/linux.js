var nodemiral = require('nodemiral');
var fs = require('fs');
var path = require('path');
var util = require('util');

var SCRIPT_DIR = path.resolve(__dirname, '../../scripts/linux');
var TEMPLATES_DIR = path.resolve(__dirname, '../../templates/linux');

exports.setup = function(config) {
  var taskList = nodemiral.taskList('Setup (linux)');

  taskList.executeScript('Installing Docker', {
    script: path.resolve(SCRIPT_DIR, 'install-docker.sh'),
    vars: {
      nodeVersion: config.nodeVersion
    }
  });

  taskList.executeScript('Setting up Environment', {
    script: path.resolve(SCRIPT_DIR, 'setup-env.sh'),
    vars: {
      appName: config.appName
    }
  });

  if(config.setupMongo) {
    taskList.copy('Copying MongoDB configuration', {
      src: path.resolve(TEMPLATES_DIR, 'mongodb.conf'),
      dest: '/etc/mongodb.conf'
    });

    taskList.executeScript('Installing MongoDB', {
      script: path.resolve(SCRIPT_DIR, 'install-mongodb.sh')
    });
  }

  // if(config.ssl) {
  //   installStud(taskList);
  //   configureStud(taskList, config.ssl.pem, config.ssl.backendPort);
  // }

  return taskList;
};

exports.deploy = function(bundlePath, env, config) {
  var deployCheckWaitTime = config.deployCheckWaitTime;
  var appName = config.appName;
  var taskList = nodemiral.taskList("Deploy app '" + appName + "' (linux)");

  taskList.copy('Uploading bundle', {
    src: bundlePath,
    dest: '/opt/' + appName + '/tmp/bundle.tar.gz',
    progressBar: true
  });

  copyEnvVars(taskList, env, appName);

  taskList.copy('Initializing start script', {
    src: path.resolve(TEMPLATES_DIR, 'start.sh'),
    dest: '/opt/' + appName + '/config/start.sh',
    vars: {
      appName: appName,
      useLocalMongo: config.setupMongo,
      port: env.PORT
    }
  });

  deployAndVerify(taskList, appName, env.PORT, deployCheckWaitTime);

  return taskList;
};

exports.reconfig = function(env, config) {
  var appName = config.appName;
  var deployCheckWaitTime = config.deployCheckWaitTime;

  var taskList = nodemiral.taskList("Updating configurations (linux)");

  copyEnvVars(taskList, env, appName);
  deployAndVerify(taskList, appName, env.PORT, deployCheckWaitTime);

  return taskList;
};

exports.restart = function(config) {
  var taskList = nodemiral.taskList("Restarting Application (linux)");

  var appName = config.appName;
  var port = config.env.PORT;
  var deployCheckWaitTime = config.deployCheckWaitTime;

  deployAndVerify(taskList, appName, port, deployCheckWaitTime);

  return taskList;
};

exports.stop = function(config) {
  var taskList = nodemiral.taskList("Stopping Application (linux)");

  //stopping
  taskList.execute('Stopping app', {
    command: 'sudo docker rm -f ' + config.appName
  });

  return taskList;
};

exports.start = function(config) {
  var taskList = nodemiral.taskList("Starting Application (linux)");

  var appName = config.appName;
  var port = config.env.PORT;
  var deployCheckWaitTime = config.deployCheckWaitTime;

  deployAndVerify(taskList, appName, port, deployCheckWaitTime);

  return taskList;
};

function installStud(taskList) {
  taskList.executeScript('Installing Stud', {
    script: path.resolve(SCRIPT_DIR, 'install-stud.sh')
  });
}

function copyEnvVars(taskList, env, appName) {
  taskList.copy('Sending environment variables', {
    src: path.resolve(TEMPLATES_DIR, 'env.list'),
    dest: '/opt/' + appName + '/config/env.list',
    vars: {
      env: env || {},
      appName: appName
    }
  });
}

function deployAndVerify(taskList, appName, port, deployCheckWaitTime) {
  // deploying
  taskList.executeScript('Invoking deployment process', {
    script: path.resolve(SCRIPT_DIR, 'deploy.sh'),
    vars: {
      appName: appName
    }
  });

  // verifying deployment
  taskList.executeScript('Verifying deployment', {
    script: path.resolve(SCRIPT_DIR, 'verify-deployment.sh'),
    vars: {
      deployCheckWaitTime: deployCheckWaitTime || 10,
      appName: appName,
      port: port
    }
  });
}