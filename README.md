# Meteor Up

> We are working on the next version of Meteor Up with more stability and fast deployments.
> For that we use Docker behind the scene.
> Check it out: https://github.com/arunoda/meteor-up/tree/mupx#

#### Production Quality Meteor Deployments

Meteor Up (mup for short) is a command line tool that allows you to deploy any [Meteor](http://meteor.com) app to your own server. It supports only Debian/Ubuntu flavours and Open Solaris at the moments. (PRs are welcome)

You can use install and use Meteor Up from Linux, Mac and Windows.

> Screencast: [How to deploy a Meteor app with Meteor Up (by Sacha Greif)](https://www.youtube.com/watch?v=WLGdXtZMmiI)

**Table of Contents**

- [Features](#features)
- [Server Configuration](#server-configuration)
    - [SSH-key-based authentication (with passphrase)](#ssh-keys-with-passphrase-or-ssh-agent-support)
- [Installation](#installation)
- [Creating a Meteor Up Project](#creating-a-meteor-up-project)
- [Example File](#example-file)
- [Setting Up a Server](#setting-up-a-server)
- [Deploying an App](#deploying-an-app)
- [Additional Setup/Deploy Information](#additional-setupdeploy-information)
    - [Server Setup Details](#server-setup-details)
    - [Deploy Wait Time](#deploy-wait-time)
    - [Multiple Deployment Targets](#multiple-deployment-targets)
- [Access Logs](#access-logs)
- [Reconfiguring & Restarting](#reconfiguring--restarting)
- [Accessing the Database](#accessing-the-database)
- [Multiple Deployments](#multiple-deployments)
- [Server Specific Environment Variables](#server-specific-environment-variables)
- [SSL Support](#ssl-support)
- [Updating](#updating)
- [Troubleshooting](#troubleshooting)
- [Binary Npm Module Support](#binary-npm-module-support)
- [Additional Resources](#additional-resources)

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

* Auto-Restart if the app crashed (using forever)
* Auto-Start after the server reboot (using upstart)
* Stepdown User Privileges
* Revert to the previous version, if the deployment failed
* Secured MongoDB Installation (Optional)
* Pre-Installed PhantomJS (Optional)

### Installation

    npm install -g mup

### Creating a Meteor Up Project

    mkdir ~/my-meteor-deployment
    cd ~/my-meteor-deployment
    mup init

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
      //"pem": "~/.ssh/id_rsa",
      // Also, for non-standard ssh port use this
      //"sshOptions": { "port" : 49154 },
      // server specific environment variables
      "env": {}
    }
  ],

  // Install MongoDB on the server. Does not destroy the local MongoDB on future setups
  "setupMongo": true,

  // WARNING: Node.js is required! Only skip if you already have Node.js installed on server.
  "setupNode": true,

  // WARNING: nodeVersion defaults to 0.10.36 if omitted. Do not use v, just the version number.
  "nodeVersion": "0.10.36",

  // Install PhantomJS on the server
  "setupPhantom": true,

  // Show a progress bar during the upload of the bundle to the server.
  // Might cause an error in some rare cases if set to true, for instance in Shippable CI
  "enableUploadProgressBar": true,

  // Application name (no spaces).
  "appName": "meteor",

  // Location of app (local directory). This can reference '~' as the users home directory.
  // i.e., "app": "~/Meteor/my-app",
  // This is the same as the line below.
  "app": "/Users/arunoda/Meteor/my-app",

  // Configure environment
  // ROOT_URL must be set to https://YOURDOMAIN.com when using the spiderable package & force SSL
  // your NGINX proxy or Cloudflare. When using just Meteor on SSL without spiderable this is not necessary
  "env": {
    "PORT": 80,
    "ROOT_URL": "http://myapp.com",
    "MONGO_URL": "mongodb://arunoda:fd8dsjsfh7@hanso.mongohq.com:10023/MyApp",
    "MAIL_URL": "smtp://postmaster%40myapp.mailgun.org:adj87sjhd7s@smtp.mailgun.org:587/"
  },

  // Meteor Up checks if the app comes online just after the deployment.
  // Before mup checks that, it will wait for the number of seconds configured below.
  "deployCheckWaitTime": 15
}
```

### Setting Up a Server

    mup setup

This will setup the server for the `mup` deployments. It will take around 2-5 minutes depending on the server's performance and network availability.

### Deploying an App

    mup deploy

This will bundle the Meteor project and deploy it to the server.

### Additional Setup/Deploy Information

#### Deploy Wait Time

Meteor Up checks if the deployment is successful or not just after the deployment. By default, it will wait 10 seconds before the check. You can configure the wait time with the `deployCheckWaitTime` option in the `mup.json`

#### SSH keys with passphrase (or ssh-agent support)

> This only tested with Mac/Linux

With the help of `ssh-agent`, `mup` can use SSH keys encrypted with a
passphrase.

Here's the process:

* First remove your `pem` field from the `mup.json`. So, your `mup.json` only has the username and host only.
* Then start a ssh agent with `eval $(ssh-agent)`
* Then add your ssh key with `ssh-add <path-to-key>`
* Then you'll asked to enter the passphrase to the key
* After that simply invoke `mup` commands and they'll just work
* Once you've deployed your app kill the ssh agent with `ssh-agent -k`

#### Ssh based authentication with `sudo`

**If your username is `root`, you don't need to follow these steps**

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

This is how Meteor Up will configure the server for you based on the given `appName` or using "meteor" as default appName. This information will help you customize the server for your needs.

* your app lives at `/opt/<appName>/app`
* mup uses `upstart` with a config file at `/etc/init/<appName>.conf`
* you can start and stop the app with upstart: `start <appName>` and `stop <appName>`
* logs are located at: `/var/log/upstart/<appName>.log`
* MongoDB installed and bound to the local interface (cannot access from the outside)
* the database is named `<appName>`

For more information see [`lib/taskLists.js`](https://github.com/arunoda/meteor-up/blob/master/lib/taskLists.js).

#### Multiple Deployment Targets

You can use an array to deploy to multiple servers at once.

To deploy to *different* environments (e.g. staging, production, etc.), use separate Meteor Up configurations in separate directories, with each directory containing separate `mup.json` and `settings.json` files, and the `mup.json` files' `app` field pointing back to your app's local directory.

#### Custom Meteor Binary

Sometimes, you might be using `mrt`, or Meteor from a git checkout. By default, Meteor Up uses `meteor`. You can ask Meteor Up to use the correct binary with the `meteorBinary` option.

~~~js
{
  ...
  "meteorBinary": "~/bin/meteor/meteor"
  ...
}
~~~

### Access Logs

    mup logs -f

Mup can tail logs from the server and supports all the options of `tail`.

### Reconfiguring & Restarting

After you've edit environmental variables or `settings.json`, you can reconfigure the app without deploying again. Use the following command to do update the settings and restart the app.

    mup reconfig

If you want to stop, start or restart your app for any reason, you can use the following commands to manage it.

    mup stop
    mup start
    mup restart

### Accessing the Database

You can't access the MongoDB from the outside the server. To access the MongoDB shell you need to log into your server via SSH first and then run the following command:

    mongo appName

### Server Specific Environment Variables

It is possible to provide server specific environment variables. Add the `env` object along with the server details in the `mup.json`. Here's an example:

~~~js
{
  "servers": [
    {
      "host": "hostname",
      "username": "root",
      "password": "password",
      "env": {
        "SOME_ENV": "the-value"
      }
    }

  ...
}
~~~

By default, Meteor UP adds `CLUSTER_ENDPOINT_URL` to make [cluster](https://github.com/meteorhacks/cluster) deployment simple. But you can override it by defining it yourself.

### Multiple Deployments

Meteor Up supports multiple deployments to a single server. Meteor Up only does the deployment; if you need to configure subdomains, you need to manually setup a reverse proxy yourself.

Let's assume, we need to deploy production and staging versions of the app to the same server. The production app runs on port 80 and the staging app runs on port 8000.

We need to have two separate Meteor Up projects. For that, create two directories and initialize Meteor Up and add the necessary configurations.

In the staging `mup.json`, add a field called `appName` with the value `staging`. You can add any name you prefer instead of `staging`. Since we are running our staging app on port 8000, add an environment variable called `PORT` with the value 8000.

Now setup both projects and deploy as you need.

### SSL Support

Meteor Up has the built in SSL support. It uses [stud](https://github.com/bumptech/stud) SSL terminator for that. First you need to get a SSL certificate from some provider. This is how to do that:

* [First you need to generate a CSR file and the private key](http://www.rackspace.com/knowledge_center/article/generate-a-csr-with-openssl)
* Then purchase a SSL certificate.
* Then generate a SSL certificate from your SSL providers UI.
* Then that'll ask to provide the CSR file. Upload the CSR file we've generated.
* When asked to select your SSL server type, select it as nginx.
* Then you'll get a set of files (your domain certificate and CA files).

Now you need combine SSL certificate(s) with the private key and save it in the mup config directory as `ssl.pem`. Check this [guide](http://alexnj.com/blog/configuring-a-positivessl-certificate-with-stud) to do that.

Then add following configuration to your `mup.json` file.

~~~js
{
  ...

  "ssl": {
    "pem": "./ssl.pem",
    //"backendPort": 80
  }

  ...
}
~~~

Now, simply do `mup setup` and now you've the SSL support.

> * By default, it'll think your Meteor app is running on port 80. If it's not, change it with the `backendPort` configuration field.
> * SSL terminator will run on the default SSL port `443`
> * If you are using multiple servers, SSL terminators will run on the each server (This is made to work with [cluster](https://github.com/meteorhacks/cluster))
> * Right now, you can't have multiple SSL terminators running inside a single server

### Updating

To update `mup` to the latest version, just type:

    npm update mup -g

You should try and keep `mup` up to date in order to keep up with the latest Meteor changes. But note that if you need to update your Node version, you'll have to run `mup setup` again before deploying.

### Troubleshooting

#### Check Access

Your issue might not always be related to Meteor Up. So make sure you can connect to your instance first, and that your credentials are working properly.

#### Check Logs
If you suddenly can't deploy your app anymore, first use the `mup logs -f` command to check the logs for error messages.

One of the most common problems is your Node version getting out of date. In that case, see “Updating” section above.

#### Verbose Output
If you need to see the output of `meteor-up` (to see more precisely where it's failing or hanging, for example), run it like so:

    DEBUG=* mup <command>

where `<command>` is one of the `mup` commands such as `setup`, `deploy`, etc.

### Binary Npm Module Support

Some of the Meteor core packages as well some of the community packages comes with npm modules which has been written in `C` or `C++`. These modules are platform dependent.
So, we need to do special handling, before running the bundle generated from `meteor bundle`.
(meteor up uses the meteor bundle)

Fortunately, Meteor Up **will take care** of that job for you and it will detect binary npm modules and re-build them before running your app on the given server.

> * Meteor 0.9 adds a similar feature where it allows package developers to publish their packages for different architecures, if their packages has binary npm modules.
> * As a side effect of that, if you are using a binary npm module inside your app via `meteorhacks:npm` package, you won't be able to deploy into `*.meteor.com`.
> * But, you'll be able to deploy with Meteor Up since we are re-building binary modules on the server.

### Additional Resources

* [Using Meteor Up with Nitrous.io](https://github.com/arunoda/meteor-up/wiki/Using-Meteor-Up-with-Nitrous.io)
* [Change Ownership of Additional Directories](https://github.com/arunoda/meteor-up/wiki/Change-Ownership-of-Additional-Directories)
* [Using Meteor Up with NginX vhosts](https://github.com/arunoda/meteor-up/wiki/Using-Meteor-Up-with-NginX-vhosts)
