#!/bin/bash

create-backend-env-file() {
  FILE=./docker/.env
cat > $FILE <<- EOM
SERVER_URL=http://localhost:8081
SERVER_PORT=8080 # Be sure that doesn't colision with the frontend port
SQL_LITE=true
SQL_LITE_PATH=./porter.db

# Disable redis by default on non docker environment, if you want to setup redis you can complete the variables commented down below
REDIS_ENABLED=false
# REDIS_HOST=redis
# REDIS_PORT=6379
# REDIS_USER=foo
# REDIS_PASS=bar
# REDIS_DB=0

# If you don't wanna use SQL lite you should fill this data with the postgres connection details
# DB_HOST=localhost 
# DB_PORT=5400
# DB_USER=porter
# DB_PASS=porter
# DB_NAME=porter

EOM
}

create-frontend-env-file() {
  FILE=./dashboard/.env
cat > $FILE <<- EOM
NODE_ENV=development

# Tell the webpack dev server in wich port we wanna run, it defaults to 8080 but we have to be carefull this is not the same port as the backend
DEV_SERVER_PORT=8081

# Usually we would use nginx, but for this environment we're going to enable webpack-dev-server proxy 
ENABLE_PROXY=true 

# API server url, this url will be used for the proxy to redirect all /api calls
API_SERVER=http://localhost:8080 
EOM
}

if [[ ! -e ./dashboard/.env ]]
then
  echo "Dashboard env file (./dashboard/.env) not found, creating one with defaults"
  create-frontend-env-file
fi

if [[ ! -e ./docker/.env ]]
then
  echo "Server env file (./docker/.env) not found, creating one with defaults"
  create-backend-env-file
fi

