package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/docker"

	"github.com/spf13/cobra"
)

type startOps struct {
	imageTag string `form:"required"`
	db       string `form:"oneof=sqlite postgres"`
	driver   string `form:"required"`
	port     *int   `form:"required"`
}

var opts = &startOps{}

var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "Commands to control a local Porter server",
}

var testCmd = &cobra.Command{
	Use:   "test",
	Short: "Testing",
	Run: func(cmd *cobra.Command, args []string) {
		setDriver("local")

		// TODO -- DOWNLOAD THE LATEST RELEASE, IF NOT EXIST
		// porterDir := filepath.Join(home, ".porter")

		// err := github.DownloadLatestServerRelease(porterDir)

		// if err != nil {
		// 	color.New(color.FgRed).Println("Failed:", err.Error())
		// 	os.Exit(1)
		// }

		cmdPath := filepath.Join(home, ".porter", "portersvr")
		sqlLitePath := filepath.Join(home, ".porter", "porter.db")
		staticFilePath := filepath.Join(home, ".porter", "static")

		cmdPorter := exec.Command(cmdPath)
		cmdPorter.Env = os.Environ()
		cmdPorter.Env = append(cmdPorter.Env, []string{
			"IS_LOCAL=true",
			"SQL_LITE=true",
			"SQL_LITE_PATH=" + sqlLitePath,
			"STATIC_FILE_PATH=" + staticFilePath,
		}...)

		cmdPorter.Stdout = os.Stdout
		cmdPorter.Stderr = os.Stderr

		err := cmdPorter.Run()

		if err != nil {
			color.New(color.FgRed).Println("Failed:", err.Error())
			os.Exit(1)
		}
	},
}

// startCmd represents the start command
var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Starts a Porter instance using the Docker engine",
	Run: func(cmd *cobra.Command, args []string) {
		if getDriver() == "docker" {
			err := startDocker(
				opts.imageTag,
				opts.db,
				*opts.port,
			)

			if err != nil {
				red := color.New(color.FgRed)
				red.Println("Error running start:", err.Error())
				red.Println("Shutting down...")

				err = stopDocker()

				if err != nil {
					red.Println("Shutdown unsuccessful:", err.Error())
				}

				os.Exit(1)
			}
		}
	},
}

var stopCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stops a Porter instance running on the Docker engine",
	Run: func(cmd *cobra.Command, args []string) {
		if getDriver() == "docker" {
			if err := stopDocker(); err != nil {
				color.New(color.FgRed).Println("Shutdown unsuccessful:", err.Error())
				os.Exit(1)
			}
		}
	},
}

func init() {
	rootCmd.AddCommand(testCmd)

	rootCmd.AddCommand(serverCmd)

	serverCmd.AddCommand(startCmd)
	serverCmd.AddCommand(stopCmd)

	startCmd.PersistentFlags().StringVar(
		&opts.db,
		"db",
		"sqlite",
		"the db to use, one of sqlite or postgres",
	)

	startCmd.PersistentFlags().StringVar(
		&opts.driver,
		"driver",
		"local",
		"the db to use, one of local or docker",
	)

	startCmd.PersistentFlags().StringVar(
		&opts.imageTag,
		"image-tag",
		"latest",
		"the Porter image tag to use",
	)

	opts.port = startCmd.PersistentFlags().IntP(
		"port",
		"p",
		8080,
		"the host port to run the server on",
	)
}

func startDocker(
	imageTag string,
	db string,
	port int,
) error {
	env := []string{
		"NODE_ENV=production",
		"FULLSTORY_ORG_ID=VXNSS",
	}

	var porterDB docker.PorterDB

	switch db {
	case "postgres":
		porterDB = docker.Postgres
	case "sqlite":
		porterDB = docker.SQLite
	}

	startOpts := &docker.PorterStartOpts{
		ProcessID:      "main",
		ServerImageTag: imageTag,
		ServerPort:     port,
		DB:             porterDB,
		Env:            env,
	}

	_, _, err := docker.StartPorter(startOpts)

	if err != nil {
		return err
	}

	green := color.New(color.FgGreen)

	green.Printf("Server ready: listening on localhost:%d\n", port)

	return setHost(fmt.Sprintf("http://localhost:%d", port))
}

func stopDocker() error {
	agent, err := docker.NewAgentFromEnv()

	if err != nil {
		return err
	}

	err = agent.StopPorterContainersWithProcessID("main", false)

	if err != nil {
		return err
	}

	green := color.New(color.FgGreen)

	green.Println("Successfully stopped the Porter server.")

	return nil
}
