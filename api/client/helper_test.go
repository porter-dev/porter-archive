package client_test

// import (
// 	"fmt"
// 	"os"
// 	"testing"

// 	"github.com/porter-dev/porter/cli/cmd/docker"
// )

// const baseURL string = "http://localhost:10000/api"

// func TestMain(m *testing.M) {
// 	err := startPorterServerWithDocker("user", 10000, docker.SQLite)

// 	if err != nil {
// 		fmt.Printf("%v\n", err)
// 		os.Exit(1)
// 	}

// 	code := m.Run()
// 	stopPorterServerWithDocker("user")

// 	os.Exit(code)
// }

// type db int

// const (
// 	pg db = iota
// 	sqlite
// )

// // Spins up and shuts down the Docker api server with the given options
// func startPorterServerWithDocker(processID string, port int, db docker.PorterDB) error {
// 	env := []string{
// 		"ADMIN_INIT=false",
// 	}

// 	startOpts := &docker.PorterStartOpts{
// 		ProcessID:      processID,
// 		ServerImageTag: "testing",
// 		ServerPort:     port,
// 		DB:             db,
// 		Env:            env,
// 	}

// 	_, _, err := docker.StartPorter(startOpts)

// 	if err != nil {
// 		return err
// 	}

// 	return nil
// }

// func stopPorterServerWithDocker(processID string) error {
// 	agent, err := docker.NewAgentFromEnv()

// 	if err != nil {
// 		return err
// 	}

// 	err = agent.StopPorterContainersWithProcessID(processID, true)

// 	if err != nil {
// 		return err
// 	}

// 	// remove volumes
// 	err = agent.RemoveLocalVolume("porter_sqlite_" + processID)

// 	return nil
// }
