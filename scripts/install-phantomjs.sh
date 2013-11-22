#!/bin/bash

#remove the lock
set +e
sudo rm /var/lib/dpkg/lock > /dev/null
sudo rm /var/cache/apt/archives/lock > /dev/null
sudo dpkg --configure -a
set -e

# install phantomjs
sudo apt-get -y install libfreetype6 libfreetype6-dev fontconfig > /dev/null
ARCH=`uname -m`

cd /usr/local/share/
sudo wget https://phantomjs.googlecode.com/files/phantomjs-1.9.1-linux-$ARCH.tar.bz2 > /dev/null
sudo tar xjf phantomjs-1.9.1-linux-$ARCH.tar.bz2  > /dev/null
sudo ln -s -f /usr/local/share/phantomjs-1.9.1-linux-$ARCH/bin/phantomjs /usr/local/share/phantomjs
sudo ln -s -f /usr/local/share/phantomjs-1.9.1-linux-$ARCH/bin/phantomjs /usr/local/bin/phantomjs
sudo ln -s -f /usr/local/share/phantomjs-1.9.1-linux-$ARCH/bin/phantomjs /usr/bin/phantomjs