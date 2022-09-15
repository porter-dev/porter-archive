#!/bin/bash

# Load env variables for backend
if [[ -e ./docker/.env ]]
then
  set -a # automatically export all variables
  source ./docker/.env
  set +a
else 
  echo "Couldn't find any backend env variables, exiting process"
  exit
fi

air -c .air.worker.toml