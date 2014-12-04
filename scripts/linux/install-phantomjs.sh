#!/bin/bash

# Remove the lock
set +e
sudo rm /var/lib/dpkg/lock > /dev/null
sudo rm /var/cache/apt/archives/lock > /dev/null  
sudo dpkg --configure -a
set -e

# Install PhantomJS
sudo apt-get -y install libfreetype6 libfreetype6-dev fontconfig > /dev/null
ARCH=`uname -m`
PHANTOMJS_VERSION=1.9.8

cd /usr/local/share/
sudo wget https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-${PHANTOMJS_VERSION}-linux-${ARCH}.tar.bz2 > /dev/null
sudo tar xjf phantomjs-${PHANTOMJS_VERSION}-linux-${ARCH}.tar.bz2  > /dev/null
sudo ln -s -f /usr/local/share/phantomjs-${PHANTOMJS_VERSION}-linux-${ARCH}/bin/phantomjs /usr/local/share/phantomjs
sudo ln -s -f /usr/local/share/phantomjs-${PHANTOMJS_VERSION}-linux-${ARCH}/bin/phantomjs /usr/local/bin/phantomjs
sudo ln -s -f /usr/local/share/phantomjs-${PHANTOMJS_VERSION}-linux-${ARCH}/bin/phantomjs /usr/bin/phantomjs
