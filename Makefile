#!make
include ./docker/.env
export $(shell sed 's/=.*//' ./docker/.env)

run-server: 
	air -c .air.toml

run-frontend:
	cd ./dashboard && npm run start -- --host
