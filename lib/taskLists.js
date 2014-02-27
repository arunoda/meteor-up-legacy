var nodemiral = require('nodemiral');
var fs = require('fs');
var path = require('path');

var SCRIPT_DIR = path.resolve(__dirname, '../scripts');
var TEMPLATES_DIR = path.resolve(__dirname, '../templates');

exports.setup = function(installMongo, setupNode, nodeVersion, setupPhantom) {
  var taskList = nodemiral.taskList('Setting Up');
  
  // Installation
  if (setupNode) {
    taskList.executeScript('installing node', {
      script: path.resolve(SCRIPT_DIR, 'install-node.sh'),
      vars: {
        nodeVersion: nodeVersion
      },
    });
  }

  if (setupPhantom) {
    taskList.executeScript('installing phantomjs', {
      script: path.resolve(SCRIPT_DIR, 'install-phantomjs.sh')
    });
  }

  taskList.executeScript('setting up environment', {
    script: path.resolve(SCRIPT_DIR, 'setup-env.sh')
  });

  if(installMongo) {
    taskList.copy('copy /etc/mongodb.conf', {
      src: path.resolve(TEMPLATES_DIR, 'mongodb.conf'),
      dest: '/etc/mongodb.conf'
    });

    taskList.executeScript('installing mongodb', {
      script: path.resolve(SCRIPT_DIR, 'install-mongodb.sh')
    });
  }

  //Configurations
  taskList.copy('configure upstart', {
    src: path.resolve(TEMPLATES_DIR, 'meteor.conf'),
    dest: '/etc/init/meteor.conf'
  });

  return taskList;
};

exports.deploy = function(bundlePath, env, deployCheckWaitTime) {
  var taskList = nodemiral.taskList("Deploying App");

  taskList.copy('uploading bundle', {
    src: bundlePath,
    dest: '/opt/meteor/tmp/bundle.tar.gz'
  });

  taskList.copy('setting up env vars', {
    src: path.resolve(TEMPLATES_DIR, 'env.sh'),
    dest: '/opt/meteor/config/env.sh',
    vars: {
      env: env || {}
    }
  });

  //deploying
  taskList.executeScript('invoking deployment process', {
    script: path.resolve(TEMPLATES_DIR, 'deploy.sh'),
    vars: {deployCheckWaitTime: deployCheckWaitTime || 10}
  });

  return taskList;
};

exports.reconfig = function(env) {
  var taskList = nodemiral.taskList("Updating Configurations");

  taskList.copy('setting up env vars', {
    src: path.resolve(TEMPLATES_DIR, 'env.sh'),
    dest: '/opt/meteor/config/env.sh',
    vars: {
      env: env || {}
    }
  });

  //deploying
  taskList.execute('restarting the app', {
    command: '(sudo stop meteor || :) && (sudo start meteor)'
  });

  return taskList;
};
