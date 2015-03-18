#!/bin/bash

# Install Node.js - either nodeVersion or which works with latest Meteor release
<% if (nodeVersion) { %>
  NODE_VERSION=<%= nodeVersion %>
<% } else {%>
  NODE_VERSION=0.10.36
<% } %>

ARCH=$(python -c 'import platform; print platform.architecture()[0]')
if [[ ${ARCH} == '64bit' ]]; then
  NODE_ARCH=x64
else
  NODE_ARCH=x86
fi

sudo apt-get -y install build-essential libssl-dev git curl

NODE_DIST=node-v${NODE_VERSION}-sunos-${NODE_ARCH}

cd /tmp
wget http://nodejs.org/dist/v${NODE_VERSION}/${NODE_DIST}.tar.gz
tar xvzf ${NODE_DIST}.tar.gz
sudo rm -rf /opt/nodejs
sudo mv ${NODE_DIST} /opt/nodejs

# set downloaded node version as the default
# XXX this needs to be changed later on
sudo ln -sf /opt/nodejs/bin/node /opt/local/bin/node
sudo ln -sf /opt/nodejs/bin/npm /opt/local/bin/npm
