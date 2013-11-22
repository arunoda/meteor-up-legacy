var nodemiral = require('nodemiral');
var fs = require('fs');
var path = require('path');

var SCRIPT_DIR = path.resolve(__dirname, '../scripts');
var TEMPLATES_DIR = path.resolve(__dirname, '../templates');

exports.setup = function(installMongo) {
  var taskList = nodemiral.taskList('Setting Up');
  
  //Installation
  taskList.executeScript('installing node', {
    script: path.resolve(SCRIPT_DIR, 'install-node.sh')
  });

  taskList.executeScript('installing phantomjs', {
    script: path.resolve(SCRIPT_DIR, 'install-phantomjs.sh')
  });

  if(installMongo) {
    taskList.executeScript('installing mongodb', {
      script: path.resolve(SCRIPT_DIR, 'install-mongodb.sh')
    });
  }

  taskList.executeScript('setting up environment', {
    script: path.resolve(SCRIPT_DIR, 'setup-env.sh')
  });

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