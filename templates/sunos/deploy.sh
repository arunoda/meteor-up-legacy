#!/bin/bash
set -e

TMP_DIR=/opt/<%= appName %>/tmp
BUNDLE_DIR=${TMP_DIR}/bundle

cd ${TMP_DIR}
sudo rm -rf bundle
sudo tar xvzf bundle.tar.gz > /dev/null

# rebuilding fibers
cd ${BUNDLE_DIR}/programs/server
sudo npm install fibers
sudo npm install bcrypt

# rebuilding other modules inside packages
<% for(var packageName in binaryNpmModules) { %>
  cd ${BUNDLE_DIR}/programs/server/npm/<%= packageName %>/main
  sudo npm rebuild <%= binaryNpmModules[packageName].join(' ') %>
<% } %>

cd /opt/<%= appName %>/

# remove old app, if it exists
if [ -d old_app ]; then
  sudo rm -rf old_app
fi

## backup current version
if [[ -d app ]]; then
  sudo mv app old_app
fi

sudo mv tmp/bundle app

# restart app
sudo svcadm disable <%= appName %> || :
sudo svcadm enable <%= appName %> || :

revert_app (){
  if [[ -d old_app ]]; then
    sudo rm -rf app
    sudo mv old_app app
    sudo svcadm disable <%= appName %> || :
    sudo svcadm enable <%= appName %> || :

    echo "Latest deployment failed! Reverted back to the previous version." 1>&2
    exit 1
  else
    echo "App did not pick up! Please check app logs." 1>&2
    exit 1
  fi
}

#wait and check
echo "Waiting for MongoDB to initialize. (5 minutes)"
. /opt/<%= appName %>/config/env.sh
wait-for-mongo ${MONGO_URL} 300000

echo "Waiting for <%= deployCheckWaitTime %> seconds while app is booting up"
sleep <%= deployCheckWaitTime %>

echo "Checking is app booted or not?"
curl localhost:${PORT} || revert_app

## chown to support dumping heapdump and etc
# sudo chown -R meteoruser app
