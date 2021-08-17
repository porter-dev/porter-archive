#!make
include ./docker/.env
export $(shell sed 's/=.*//' ./docker/.env)

setup:
	go mod download;
	cd dashboard && npm install;
	cd ../;

run-server: 
	air -c .air.toml

run-frontend:
	cd ./dashboard && npm run start