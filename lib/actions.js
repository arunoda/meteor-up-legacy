var nodemiral = require('nodemiral');
var taskLists = require('./taskLists');

module.exports = function(session) {
  return new Actions(session);
};

function Actions(config) {
  this.config = config;
  
  // build the session
  var options = {
    ssh: {'StrictHostKeyChecking': 'no', 'UserKnownHostsFile': '/dev/null'}
  };
  var host = config.server.host;
  var auth = {username: config.server.username};

  if(config.server.pem) {
    auth.pem = fs.readFileSync(path.resolve(config.server.pem), 'utf8');
  } else {
    auth.password = config.server.password;
  }

  this.session = nodemiral.session(host, auth, options);
}

Actions.prototype.setup = function() {
  var taskList = taskLists.setup(this.config.installMongo);
  taskList.run(this.session);
};