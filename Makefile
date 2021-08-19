BINDIR      := $(CURDIR)/bin
VERSION ?= dev

start-dev: install setup-env-files
	bash ./scripts/dev-environment/StartDevServer.sh

install: 
	bash ./scripts/dev-environment/SetupEnvironment.sh

setup-env-files: 
	bash ./scripts/dev-environment/CreateDefaultEnvFiles.sh

build-cli: 
	go build -ldflags="-w -s -X 'github.com/porter-dev/porter/cli/cmd.Version=${VERSION}'" -a -tags cli -o $(BINDIR)/porter ./cli