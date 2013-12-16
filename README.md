# Meteor UP
### Production Quality Meteor Deployments

Meteor Up (mup for shorter) is a command line tool, which allows you to deploy any meteor app into a your own server. It support Ubuntu 12.04 or higher servers from any Cloud Infrastructure Provider.

## Meteor UP Features

* Single command server setup
* Single command deployment
* Environmental Variables management
* Support for [`settings.json`](http://docs.meteor.com/#meteor_settings)
* Password or Private Key(pem) based server authentication
* Access, logs from the terminal (supports log tailing)

## Server Configurations Meteor Up Does

* Auto-Restart if the app crashed (using forever)
* Auto-Start after the server reboot (using upstart)
* Stepdown User Privileges
* Revert to the previous version, if the deployment failed
* Support for **Hot Code Reload**
* Secured MongoDB Installation
* Pre-Installed PhantomJS

### Installation

    npm install -g mup

If you are looking for password based authentication, you need to [install sshpass](https://gist.github.com/arunoda/7790979) on your local development machine.

### Creating a Meteor Up Project

    mkdir ~/my-meteor-deployment
    cd ~/my-meteor-deployment
    mup init

This will create two files in your mup project directory, which are:

  * mup.json - Meteor Up configuration file
  * settings.json - Settings for Meteor's [settings API](http://docs.meteor.com/#meteor_settings)

`mup.json` is commented and easy to follow (it supports JavaScript comments)

### Setting Up the Server

    mup setup

This will setup the server for the mup deployments. It will take around 2-5 minutes depending on the server's performance and network availability.

### Deploy the App

    mup deploy

This will bundle the meteor project and deploy it to the server.

#### Deploy Wait Time
Meteor-Up checks for if the deployment is successful or not just after the deployment. By default, it will wait 10 seconds before the check. You can configure the wait time with `deployCheckWaitTime` option in the `mup.json`

### Access Logs

    mup logs -f

Mup can tail logs from the server and it supports all the options of `tail`

### Reconfiguring

After you've edit environmental variables or settings.json, you can reconfigure the app without deploying again. Use following command for that.

    mup reconfig

## Server Setup

Here is how Meteor Up, configure the server for you. This information will help you to customize server for your needs.

* your app is lives in `/opt/meteor/app`
* mup uses upstart with a config file at `/etc/init/meteor.conf`
* you can start and stop the app with upstart: `start meteor` and `stop meteor`
* logs are located at: `/var/log/upstart/app.log`
* MongoDB installed and bind to the local interface (cannot access from the outside)
* `mongo` is the name of the database

for more information see [`lib/taskLists.js`](https://github.com/arunoda/meteor-up/blob/master/lib/taskLists.js)

## Multiple Deployment Targets

You can use an array to deploy to multiple servers at once. To deploy to *different* servers, use separate Meteor UP configurations (e.g. separate folders).
