#!/bin/bash

# required to update system
sudo apt-get update

# install nodejs - either nodeVersion or last known version supporting websockets with Meteor

<% if (nodeVersion) { %>
  NODE_VERSION=<%= nodeVersion %>
<% } else {%>
  NODE_VERSION=0.10.24
<% } %>

ARCH=`uname -m`
if [[ $ARCH == 'x86_64' ]]; then
  NODE_ARCH=x64
else
  NODE_ARCH=x86
fi

sudo apt-get -y install build-essential libssl-dev git curl

cd /tmp
wget http://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$NODE_ARCH.tar.gz
tar xvzf node-v$NODE_VERSION-linux-$NODE_ARCH.tar.gz
sudo rm -rf /opt/nodejs
sudo mv node-v$NODE_VERSION-linux-$NODE_ARCH /opt/nodejs

sudo ln -sf /opt/nodejs/bin/node /usr/bin/node
sudo ln -sf /opt/nodejs/bin/npm /usr/bin/npm