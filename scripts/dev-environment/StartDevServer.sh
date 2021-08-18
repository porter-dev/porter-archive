#!/bin/bash

printf "\033c"

startFrontend() {
  cd ./dashboard && npm start;
}

startBackend() {
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
  air -c .air.toml
}

startBackend &
startFrontend &
wait

cleanup() {
    rv=$?
    clear
    exit $rv
}

trap "cleanup" EXIT