BINDIR      := $(CURDIR)/bin
VERSION ?= dev

start-dev: install setup-env-files
	bash ./scripts/dev-environment/StartDevServer.sh

run-migrate-dev: install setup-env-files
	bash ./scripts/dev-environment/RunMigrateDev.sh

install:
	bash ./scripts/dev-environment/SetupEnvironment.sh

setup-env-files:
	bash ./scripts/dev-environment/CreateDefaultEnvFiles.sh

build-cli:
	go build -ldflags="-w -s -X 'github.com/porter-dev/porter/cli/cmd.Version=${VERSION}'" -a -tags cli -o $(BINDIR)/porter ./cli

build-cli-dev:
	go build -tags cli -o $(BINDIR)/porter ./cli

test-runtime:
	go build -tags test-runtime -o $(BINDIR)/test-runtime ./cmd/test-runtime
