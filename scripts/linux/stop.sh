APPNAME=<%= appName %>

docker rm -f $APPNAME || :
docker rm -f $APPNAME-frontend || :