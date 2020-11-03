package api_test

import (
	"github.com/porter-dev/porter/cli/cmd/docker"
)

type db int

const (
	pg db = iota
	sqlite
)

// Spins up and shuts down the Docker api server with the given options
func startPorterServerWithDocker(processID string, port int, db docker.PorterDB) error {
	env := []string{
		"ADMIN_INIT=false",
	}

	startOpts := &docker.PorterStartOpts{
		ProcessID:      processID,
		ServerImageTag: "testing",
		ServerPort:     port,
		DB:             db,
		KubeconfigPath: "",
		SkipKubeconfig: true,
		Env:            env,
	}

	_, _, err := docker.StartPorter(startOpts)

	if err != nil {
		return err
	}

	return nil
}

func stopPorterServerWithDocker(processID string) error {
	agent, err := docker.NewAgentFromEnv()

	if err != nil {
		return err
	}

	err = agent.StopPorterContainersWithProcessID(processID)

	if err != nil {
		return err
	}

	// remove stopped containers and volumes

	return nil
}
