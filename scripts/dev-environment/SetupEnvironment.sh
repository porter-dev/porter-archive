#!/bin/bash

# Setup all the environment requirements.

REQUIRED_APPLICATIONS=('node' 'go' 'npm')
for i in "${REQUIRED_APPLICATIONS[@]}"; do
  if ! command -v $i &> /dev/null
  then
    echo "${i} could not be found, please install to be able to execute dev environment"
    exit
  fi
done


if ! command -v air &> /dev/null
then 
  printf "\n"
  read -p "cosmtrek/air is required to continue, do you want to install it? y/N: " -n 1 -r
  if [[ $REPLY =~ ^[Yy]$ ]]
  then
    echo "Yes"
    curl -sSfL https://raw.githubusercontent.com/cosmtrek/air/master/install.sh | sh -s -- -b $(go env GOPATH)/bin
    printf "\nInstalled Air\n"
    air -v
  else 
    printf "\nCanceled script, exiting program\n"
    exit
  fi
fi


if [[ ! -d ./dashboard/node_modules ]]; then 
  echo "Couldn't find node_modules, installing npm packages"
  cd ./dashboard && npm install;
  cd ../;  
else
  echo "Node modules found! Proceeding to start server"
fi
