package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/cli/cmd/github"

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
	Use:     "server",
	Aliases: []string{"svr"},
	Short:   "Commands to control a local Porter server",
}

// startCmd represents the start command
var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Starts a Porter server instance on the host",
	Run: func(cmd *cobra.Command, args []string) {
		if config.Driver == "docker" {
			config.SetDriver("docker")

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
		} else {
			config.SetDriver("local")
			err := startLocal(
				opts.db,
				*opts.port,
			)

			if err != nil {
				red := color.New(color.FgRed)
				red.Println("Error running start:", err.Error())
				os.Exit(1)
			}
		}
	},
}

var stopCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stops a Porter instance running on the Docker engine",
	Run: func(cmd *cobra.Command, args []string) {
		if config.Driver == "docker" {
			if err := stopDocker(); err != nil {
				color.New(color.FgRed).Println("Shutdown unsuccessful:", err.Error())
				os.Exit(1)
			}
		}
	},
}

func init() {
	rootCmd.AddCommand(serverCmd)

	serverCmd.AddCommand(startCmd)
	serverCmd.AddCommand(stopCmd)

	serverCmd.PersistentFlags().AddFlagSet(driverFlagSet)

	startCmd.PersistentFlags().StringVar(
		&opts.db,
		"db",
		"sqlite",
		"the db to use, one of sqlite or postgres",
	)

	startCmd.PersistentFlags().StringVar(
		&opts.imageTag,
		"image-tag",
		"latest",
		"the Porter image tag to use (if using docker driver)",
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

	return config.SetHost(fmt.Sprintf("http://localhost:%d", port))
}

func startLocal(
	db string,
	port int,
) error {
	if db == "postgres" {
		return fmt.Errorf("postgres not available for local driver, run \"porter server start --db postgres --driver docker\"")
	}

	config.SetHost(fmt.Sprintf("http://localhost:%d", port))

	porterDir := filepath.Join(home, ".porter")
	cmdPath := filepath.Join(home, ".porter", "portersvr")
	sqlLitePath := filepath.Join(home, ".porter", "porter.db")
	staticFilePath := filepath.Join(home, ".porter", "static")

	if _, err := os.Stat(cmdPath); os.IsNotExist(err) {
		err := downloadMatchingRelease(porterDir)

		if err != nil {
			color.New(color.FgRed).Println("Failed to download server binary:", err.Error())
			os.Exit(1)
		}
	}

	// otherwise, check the version flag of the binary
	cmdVersionPorter := exec.Command(cmdPath, "--version")
	writer := &versionWriter{}
	cmdVersionPorter.Stdout = writer

	err := cmdVersionPorter.Run()

	if err != nil || writer.Version != Version {
		err := downloadMatchingRelease(porterDir)

		if err != nil {
			color.New(color.FgRed).Println("Failed to download server binary:", err.Error())
			os.Exit(1)
		}
	}

	cmdPorter := exec.Command(cmdPath)
	cmdPorter.Env = os.Environ()
	cmdPorter.Env = append(cmdPorter.Env, []string{
		"IS_LOCAL=true",
		"SQL_LITE=true",
		"SQL_LITE_PATH=" + sqlLitePath,
		"STATIC_FILE_PATH=" + staticFilePath,
		"REDIS_ENABLED=false",
	}...)

	if _, found := os.LookupEnv("GITHUB_ENABLED"); !found {
		cmdPorter.Env = append(cmdPorter.Env, "GITHUB_ENABLED=false")
	}

	if _, found := os.LookupEnv("PROVISIONER_ENABLED"); !found {
		cmdPorter.Env = append(cmdPorter.Env, "PROVISIONER_ENABLED=false")
	}

	cmdPorter.Stdout = os.Stdout
	cmdPorter.Stderr = os.Stderr

	err = cmdPorter.Run()

	if err != nil {
		color.New(color.FgRed).Println("Failed:", err.Error())
		os.Exit(1)
	}

	return nil
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

func downloadMatchingRelease(porterDir string) error {
	z := &github.ZIPReleaseGetter{
		AssetName:           "portersvr",
		AssetFolderDest:     porterDir,
		ZipFolderDest:       porterDir,
		ZipName:             "portersvr_latest.zip",
		EntityID:            "porter-dev",
		RepoName:            "porter",
		IsPlatformDependent: true,
		Downloader: &github.ZIPDownloader{
			ZipFolderDest:   porterDir,
			AssetFolderDest: porterDir,
			ZipName:         "portersvr_latest.zip",
		},
	}

	err := z.GetRelease(Version)

	if err != nil {
		return err
	}

	zStatic := &github.ZIPReleaseGetter{
		AssetName:           "static",
		AssetFolderDest:     filepath.Join(porterDir, "static"),
		ZipFolderDest:       porterDir,
		ZipName:             "static_latest.zip",
		EntityID:            "porter-dev",
		RepoName:            "porter",
		IsPlatformDependent: false,
		Downloader: &github.ZIPDownloader{
			ZipFolderDest:   porterDir,
			AssetFolderDest: filepath.Join(porterDir, "static"),
			ZipName:         "static_latest.zip",
		},
	}

	return zStatic.GetRelease(Version)
}

type versionWriter struct {
	Version string
}

func (v *versionWriter) Write(p []byte) (n int, err error) {
	v.Version = strings.TrimSpace(string(p))

	return len(p), nil
}
