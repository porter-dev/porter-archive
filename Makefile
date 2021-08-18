start-dev: install setup-env-files
	bash ./scripts/dev-environment/StartDevServer.sh

install: 
	bash ./scripts/dev-environment/SetupEnvironment.sh

setup-env-files: 
	bash ./scripts/dev-environment/CreateDefaultEnvFiles.sh

