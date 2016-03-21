# Meteor Up X (Stable Version)

> The latest development version of mup is https://github.com/kadirahq/meteor-up.

#### Production Quality Meteor Deployments

Meteor Up is a command line tool that allows you to deploy any [Meteor](http://meteor.com) app to your own server. It currently supports Ubuntu. There are plans to support other linux distros soon.

You can use install and use Meteor Up from Linux, Mac and **Windows**.

This version of Meteor Up is powered by [Docker](http://www.docker.com/) and it makes Meteor Up easy to manage. It also reduce a lot of server specific errors.

**Table of Contents**

- [Features](#features)
- [Server Configuration](#server-configuration)
- [Installation](#installation)
- [Creating a Meteor Up Project](#creating-a-meteor-up-project)
- [Example File](#example-file)
- [Setting Up a Server](#setting-up-a-server)
- [Deploying an App](#deploying-an-app)
- [Build Options](#build-options)
- [Additional Setup/Deploy Information](#additional-setupdeploy-information)
    - [Server Setup Details](#server-setup-details)
    - [Deploy Wait Time](#deploy-wait-time)
    - [Multiple Deployment Targets](#multiple-deployment-targets)
- [Accessing the Database](#accessing-the-database)
- [Multiple Deployments](#multiple-deployments)
- [Server Specific Environment Variables](#server-specific-environment-variables)
- [SSL Support](#ssl-support)
- [Updating](#updating)
- [Troubleshooting](#troubleshooting)
- [Migrating from Meteor Up 0.x](#migrating-from-meteor-up-0x)

### Features

* Single command server setup
* Single command deployment
* Multi server deployment
* Environmental Variables management
* Support for [`settings.json`](http://docs.meteor.com/#meteor_settings)
* Password or Private Key(pem) based server authentication
* Access, logs from the terminal (supports log tailing)
* Support for multiple meteor deployments (experimental)

### Server Configuration

* Auto-Restart if the app crashed
* Auto-Start after the server reboot
* Runs with docker so gives us better security and isolation.
* Revert to the previous version, if the deployment failed
* Secured MongoDB Installation (Optional)
* Pre-Installed PhantomJS

### Installation

    npm install -g mupx

### Creating a Meteor Up Project

    mkdir ~/my-meteor-deployment
    cd ~/my-meteor-deployment
    mupx init

This will create two files in your Meteor Up project directory:

  * mup.json - Meteor Up configuration file
  * settings.json - Settings for Meteor's [settings API](http://docs.meteor.com/#meteor_settings)

`mup.json` is commented and easy to follow (it supports JavaScript comments).

### Example File

```js
{
  // Server authentication info
  "servers": [
    {
      "host": "hostname",
      "username": "root",
      "password": "password",
      // or pem file (ssh based authentication)
      // WARNING: Keys protected by a passphrase are not supported
      //"pem": "~/.ssh/id_rsa"
      // Also, for non-standard ssh port use this
      //"sshOptions": { "port" : 49154 },
      // server specific environment variables
      "env": {}
    }
  ],

  // Install MongoDB on the server. Does not destroy the local MongoDB on future setups
  "setupMongo": true,

  // Application name (no spaces).
  "appName": "meteor",

  // Location of app (local directory). This can reference '~' as the users home directory.
  // i.e., "app": "~/Meteor/my-app",
  // This is the same as the line below.
  "app": "/Users/arunoda/Meteor/my-app",

  // Configure environment
  // ROOT_URL must be set to your correct domain (https or http)
  "env": {
    "PORT": 80,
    "ROOT_URL": "http://myapp.com"
  },

  // Meteor Up checks if the app comes online just after the deployment.
  // Before mup checks that, it will wait for the number of seconds configured below.
  "deployCheckWaitTime": 15,

  // show a progress bar while uploading.
  // Make it false when you deploy using a CI box.
  "enableUploadProgressBar": true
}
```

### Setting Up a Server

    mupx setup

This will setup the server for the `mupx` deployments. It will take around 2-5 minutes depending on the server's performance and network availability.

### Deploying an App

    mupx deploy

This will bundle the Meteor project and deploy it to the server. Bundling process is very similar to how `meteor deploy` do it.

### Other Utility Commands

* `mupx reconfig` - reconfigure app with new environment variables and Meteor settings
* `mupx stop` - stop the app
* `mupx start` - start the app
* `mupx restart` - restart the app
* `mupx logs [-f --tail=50]` - get logs

### Build Options

When building the meteor app, we can invoke few options. So, you can mention them in `mup.json` like this:

~~~js
...
"buildOptions": {
  // build with the debug mode on
  "debug": true,
  // mobile setting for cordova apps
  "mobileSettings": {
    "public": {
      "meteor-up": "rocks"
    }
  },
  // executable used to build the meteor project
  // you can set a local repo path if needed
  "executable": "meteor"
}
...
~~~

### Additional Setup/Deploy Information

#### Deploy Wait Time

Meteor Up checks if the deployment is successful or not just after the deployment. By default, it will wait 15 seconds before the check. You can configure the wait time with the `deployCheckWaitTime` option in the `mup.json`

#### SSH keys with paraphrase (or ssh-agent support)

> This only tested with Mac/Linux

It's common to use paraphrase enabled SSH keys to add an extra layer of protection to your SSH keys. You can use those keys with `mup` too. In order to do that, you need to use a `ssh-agent`.

Here's the process:

* First remove your `pem` field from the `mup.json`. So, your `mup.json` only has the username and host only.
* Then start a ssh agent with `eval $(ssh-agent)`
* Then add your ssh key with `ssh-add <path-to-key>`
* Then you'll asked to enter the paraphrase to the key
* After that simply invoke `mup` commands and they'll just work
* Once you've deployed your app kill the ssh agent with `ssh-agent -k`

#### Ssh based authentication with `sudo`

**If your username is `root` or using AWS EC2, you don't need to follow these steps**

Please ensure your key file (pem) is not protected by a passphrase. Also the setup process will require NOPASSWD access to sudo. (Since Meteor needs port 80, sudo access is required.)

Make sure you also add your ssh key to the ```/YOUR_USERNAME/.ssh/authorized_keys``` list

You can add your user to the sudo group:

    sudo adduser *username*  sudo

And you also need to add NOPASSWD to the sudoers file:

    sudo visudo

    # replace this line
    %sudo  ALL=(ALL) ALL

    # by this line
    %sudo ALL=(ALL) NOPASSWD:ALL  

When this process is not working you might encounter the following error:

    'sudo: no tty present and no askpass program specified'

#### Server Setup Details

Meteor Up uses Docker to run and manage your app. It uses [MeteorD](https://github.com/meteorhacks/meteord) behind the scenes. Here's how we manage and utilize the server.

* your currently running meteor bundle lives at `/opt/<appName>/current`.
* we've a demonized docker container running the above bundle.
* docker container is started with `--restart=always` flag and it'll re-spawn the container if dies.
* logs are maintained via Docker.
* If you decided to use MongoDB, it'll be also running as a Docker conatiner. It's bound to the local interface and port 27017 (you cannot access from the outside)
* the database is named `<appName>`

For more information see [`lib/taskLists.js`](https://github.com/arunoda/meteor-up/blob/mupx/lib/taskLists/linux.js).

#### Multiple Deployment Targets

You can use an array to deploy to multiple servers at once.

To deploy to *different* environments (e.g. staging, production, etc.), use separate Meteor Up configurations in separate directories, with each directory containing separate `mup.json` and `settings.json` files, and the `mup.json` files' `app` field pointing back to your app's local directory.

### Accessing the Database

You can't access the MongoDB from the outside the server. To access the MongoDB shell you need to log into your server via SSH first and then run the following command:

    docker exec -it mongodb mongo <appName>

> Later on we'll be using a separate MongoDB instance for every app.

### Server Specific Environment Variables

It is possible to provide server specific environment variables. Add the `env` object along with the server details in the `mup.json`. Here's an example:

~~~js
{
  "servers": [
    {
      "host": "hostname",
      "username": "root",
      "password": "password"
      "env": {
        "SOME_ENV": "the-value"
      }
    }

  ...
}
~~~

By default, Meteor Up adds `CLUSTER_ENDPOINT_URL` to make [cluster](https://github.com/meteorhacks/cluster) deployment simple. But you can override it by defining it yourself.

### Multiple Deployments

Meteor Up supports multiple deployments to a single server. Meteor Up only does the deployment; if you need to configure subdomains, you need to manually setup a reverse proxy yourself.

Let's assume, we need to deploy production and staging versions of the app to the same server. The production app runs on port 80 and the staging app runs on port 8000.

We need to have two separate Meteor Up projects. For that, create two directories and initialize Meteor Up and add the necessary configurations.

In the staging `mup.json`, add a field called `appName` with the value `staging`. You can add any name you prefer instead of `staging`. Since we are running our staging app on port 8000, add an environment variable called `PORT` with the value 8000.

Now setup both projects and deploy as you need.

### Changing `appName`

It's pretty okay to change the `appName`. But before you do so, you need to stop the project with older `appName`

### Custom configuration and settings files

You can keep multiple configuration and settings files in the same directory and pass them to mup using the command parameters `--settings` and `--config`. For example, to use a file `mup-staging.json` and `staging-settings.json` add the parameters like this:

    mup deploy --config=mup-staging.json --settings=staging-settings.json

### SSL Support

Meteor Up can enable SSL support for your app. It's uses the latest version of Nginx for that.

To do that just add following configuration to your `mup.json` file.

~~~js
{
  ...

  "ssl": {
    "certificate": "./bundle.crt", // this is a bundle of certificates
    "key": "./private.key", // this is the private key of the certificate
    "port": 443 // 443 is the default value and it's the standard HTTPS port
  }

  ...
}
~~~

Now, simply do `mup setup` and then `mup deploy`. Now your app is running with a modern SSL setup.

To learn more about the SSL setup refer to the [`mup-frontend-server`](https://github.com/meteorhacks/mup-frontend-server) project.

### Updating Mup

To update `mupx` to the latest version, just type:

    npm update mupx -g

You should try and keep `mupx` up to date in order to keep up with the latest Meteor changes.

### Troubleshooting

#### Check Logs
If you suddenly can't deploy your app anymore, first use the `mupx logs -f` command to check the logs for error messages.

One of the most common problems is your Node version getting out of date. In that case, see “Updating” section above.

#### Verbose Output
If you need to see the output of `mupx` (to see more precisely where it's failing or hanging, for example), run it like so:

    DEBUG=* mupx <command>

where `<command>` is one of the `mupx` commands such as `setup`, `deploy`, etc.

### Migrating from Meteor Up 0.x

`mupx` is not fully backward compatible with Meteor Up 0.x. But most of the `mup.json` remain the same. Here are some of the changes:

* Docker is the now runtime for Meteor Up
* We don't have use Upstart any more
* You don't need to setup NodeJS version or PhantomJS manually (MeteorD will take care of it)
* We use a mongodb docker container to run the local mongodb data (it uses the old mongodb location)
* It uses a Nginx and a different SSL configurations
* Now we don't re-build binaries. Instead we build for the `os.linux.x86_64` architecture. (This is the same thing what meteor-deploy does)

#### Migration Guide

> Use a new server if possible as you can. Then migrate DNS accordingly. That's the easiest and safest way.

Let's assume our appName is `meteor`

* stop the app with `stop meteor`
* Then remove upstrat config file: `rm /etc/init/meteor.conf`
* stop stud if you are using SSL: `stop stud`
* Then remove upstrat config file: `rm /etc/init/stud.conf`
* Stop mongodb if you are using: `stop mongod`
* Remove MongoDB with: `apt-get remove mongodb`

Then do `mupx setup` and then `mupx deploy`.
