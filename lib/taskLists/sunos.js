var nodemiral = require('nodemiral');
var fs = require('fs');
var path = require('path');

var SCRIPT_DIR = path.resolve(__dirname, '../../scripts/sunos');
var TEMPLATES_DIR = path.resolve(__dirname, '../../templates/sunos');

exports.setup = function(installMongo, setupNode, nodeVersion, setupPhantom, appName) {
  var taskList = nodemiral.taskList('Setup (sunos)');

  // Installation
  if(setupNode) {
    taskList.executeScript('Installing Node.js', {
      script: path.resolve(SCRIPT_DIR, 'install-node.sh'),
      vars: {
        nodeVersion: nodeVersion
      }
    });
  }

  taskList.executeScript('Setting up Environment', {
    script: path.resolve(SCRIPT_DIR, 'setup-env.sh'),
    vars: {
      appName: appName
    }
  });

  taskList.copy('Setting up Running Script', {
    src: path.resolve(TEMPLATES_DIR, 'run.sh'),
    dest: '/opt/' + appName + '/run.sh',
    vars: {
      appName: appName
    }
  });

  var serviceManifestDest = '/opt/' + appName + '/config/service-manifest.xml';
  taskList.copy('Copying SMF Manifest', {
    src: path.resolve(TEMPLATES_DIR, 'service-manifest.xml'),
    dest: serviceManifestDest,
    vars: {
      appName: appName
    }
  });

  taskList.execute('Configuring SMF Manifest', {
    command: 'sudo svccfg import ' + serviceManifestDest
  });

  return taskList;
};

exports.deploy = function(bundlePath, env, deployCheckWaitTime, appName) {
  var taskList = nodemiral.taskList("Deploy app '" + appName + "' (sunos)");

  taskList.copy('Uploading bundle', {
    src: bundlePath,
    dest: '/opt/' + appName + '/tmp/bundle.tar.gz'
  });

  reconfig(taskList, appName, env);

  // deploying
  taskList.executeScript('Invoking deployment process', {
    script: path.resolve(TEMPLATES_DIR, 'deploy.sh'),
    vars: {
      deployCheckWaitTime: deployCheckWaitTime || 10,
      appName: appName
    }
  });

  return taskList;
};

exports.reconfig = function(env, appName) {
  var taskList = nodemiral.taskList("Updating configurations (sunos)");

  reconfig(taskList, appName, env);

  //deploying
  taskList.execute('Restarting app', {
    command: '(sudo svcadm disable ' + appName + ' || :) && (sudo svcadm enable ' + appName + ')'
  });

  return taskList;
};

exports.restart = function(appName) {
  var taskList = nodemiral.taskList("Restarting Application (sunos)");

  //restarting
  taskList.execute('Restarting app', {
    command: '(sudo svcadm disable ' + appName + ' || :) && (sudo svcadm enable ' + appName + ')'
  });

  return taskList;
};

exports.stop = function(appName) {
  var taskList = nodemiral.taskList("Stopping Application (sunos)");

  //stopping
  taskList.execute('Stopping app', {
    command: '(sudo svcadm disable ' + appName + ')'
  });

  return taskList;
};

exports.start = function(appName) {
  var taskList = nodemiral.taskList("Starting Application (sunos)");

  reconfig(taskList, appName, env);

  //starting
  taskList.execute('Starting app', {
    command: '(sudo svcadm enable ' + appName + ')'
  });

  return taskList;
};

function reconfig(taskList, appName, env) {
  taskList.copy('Setting up Environment Variables', {
    src: path.resolve(TEMPLATES_DIR, 'env.sh'),
    dest: '/opt/' + appName + '/config/env.sh',
    vars: {
      env: env || {},
      appName: appName
    }
  });
}
