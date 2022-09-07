#!/bin/bash

go build -tags ee -o ./bin/admin ./cmd/admin 

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

./bin/admin "$@"