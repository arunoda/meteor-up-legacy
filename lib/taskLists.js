var nodemiral = require('nodemiral');
var fs = require('fs');
var path = require('path');

var SCRIPT_DIR = path.resolve(__dirname, '../scripts');
var TEMPLATES_DIR = path.resolve(__dirname, '../templates');

exports.setup = function(installMongo) {
  var taskList = nodemiral.taskList('Setting Up');
  
  // Installation
  taskList.executeScript('installing node', {
    script: path.resolve(SCRIPT_DIR, 'install-node.sh')
  });

  taskList.executeScript('installing phantomjs', {
    script: path.resolve(SCRIPT_DIR, 'install-phantomjs.sh')
  });

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

  taskList.copy('setttings up deployment', {
    src: path.resolve(TEMPLATES_DIR, 'deploy.sh'),
    dest: '/opt/meteor/deploy.sh'
  });

  return taskList;
};

exports.deploy = function(bundlePath, cwd, env) {
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

  var setttingsJsonPath = path.resolve(cwd, 'settings.json');
  if(fs.existsSync(setttingsJsonPath)) {
    taskList.copy('uploading settings.json', {
      src: setttingsJsonPath,
      dest: '/opt/meteor/config/settings.json'
    });
  } else {
    taskList.execute('cleaning up old settings.json', {
      command: 'sudo rm /opt/meteor/config/settings.json || :'
    });
  }

  //deploying
  taskList.execute('calling deploy script', {
    command: 'sudo bash /opt/meteor/deploy.sh'
  });

  return taskList;
};

exports.reconfig = function(cwd, env) {
  var taskList = nodemiral.taskList("Updating Configurations");

  taskList.copy('setting up env vars', {
    src: path.resolve(TEMPLATES_DIR, 'env.sh'),
    dest: '/opt/meteor/config/env.sh',
    vars: {
      env: env || {}
    }
  });

  var setttingsJsonPath = path.resolve(cwd, 'settings.json');
  if(fs.existsSync(setttingsJsonPath)) {
    taskList.copy('uploading settings.json', {
      src: setttingsJsonPath,
      dest: '/opt/meteor/config/settings.json'
    });
  } else {
    taskList.execute('cleaning up old settings.json', {
      command: 'sudo rm /opt/meteor/config/settings.json || :'
    });
  }

  //deploying
  taskList.execute('calling deploy script', {
    command: 'sudo bash /opt/meteor/deploy.sh'
  });

  return taskList;
};