#!/bin/bash

# utilities
gyp_rebuild_inside_node_modules () {
  for npmModule in ./*; do
    cd $npmModule
    if [ -f binding.gyp ]; then
      echo "=> re-installing binary npm module '${npmModule:2}' of package '${package:2}'"
      sudo node-gyp rebuild
    fi

    # recursively rebuild npm modules inside node_modules
    if [ -d ./node_modules ]; then
      cd ./node_modules
        gyp_rebuild_inside_node_modules
      cd ../
    fi
    cd ..
  done
}

rebuild_binary_npm_modules () {
  for package in ./*; do 
    if [ -d $package ]; then
      cd $package/node_modules
        gyp_rebuild_inside_node_modules
      cd ../../
    fi
  done
}

revert_app (){
  if [[ -d old_app ]]; then
    sudo rm -rf app
    sudo mv old_app app
    sudo stop <%= appName %> || :
    sudo start <%= appName %> || :

    echo "Latest deployment failed! Reverted back to the previous version." 1>&2
    exit 1
  else
    echo "App did not pick up! Please check app logs." 1>&2
    exit 1
  fi
}

# logic
set -e

TMP_DIR=/opt/<%= appName %>/tmp
BUNDLE_DIR=${TMP_DIR}/bundle

cd ${TMP_DIR}
sudo rm -rf bundle
sudo tar xvzf bundle.tar.gz > /dev/null

# rebuilding fibers
cd ${BUNDLE_DIR}/programs/server

if [ -f package.json ]; then
  # support for 0.9
  sudo npm install
  cd npm
  rebuild_binary_npm_modules
  cd ../
else 
  # support for older versions
  sudo npm install fibers
  sudo npm install bcrypt
fi

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

#wait and check
echo "Waiting for MongoDB to initialize. (5 minutes)"
. /opt/<%= appName %>/config/env.sh
wait-for-mongo ${MONGO_URL} 300000

# restart app
sudo svcadm disable <%= appName %> || :
sudo svcadm enable <%= appName %> || :

echo "Waiting for <%= deployCheckWaitTime %> seconds while app is booting up"
sleep <%= deployCheckWaitTime %>

echo "Checking is app booted or not?"
curl localhost:${PORT} || revert_app

## chown to support dumping heapdump and etc
# sudo chown -R meteoruser app
