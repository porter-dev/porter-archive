package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/porter-dev/porter/cli/cmd/docker"
	"k8s.io/client-go/util/homedir"

	"github.com/porter-dev/porter/cli/cmd/credstore"

	"github.com/spf13/cobra"
)

type startOps struct {
	insecure       *bool
	skipKubeconfig *bool
	kubeconfigPath string
	contexts       *[]string
	imageTag       string `form:"required"`
	db             string `form:"oneof=sqlite postgres"`
}

var opts = &startOps{}

// startCmd represents the start command
var startCmd = &cobra.Command{
	Args: func(cmd *cobra.Command, args []string) error {
		return nil
	},
	Use:   "start",
	Short: "Starts a Porter instance using the Docker engine.",
	Run: func(cmd *cobra.Command, args []string) {
		err := start(
			opts.imageTag,
			opts.kubeconfigPath,
			opts.db,
			*opts.contexts,
			*opts.insecure,
			*opts.skipKubeconfig,
		)

		if err != nil {
			fmt.Println("Error running start:", err.Error())
			fmt.Println("Shutting down...")

			err = stop()

			if err != nil {
				fmt.Println("Shutdown unsuccessful:", err.Error())
			}

			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(startCmd)

	opts.insecure = startCmd.PersistentFlags().Bool(
		"insecure",
		false,
		"skip admin setup and authorization",
	)

	opts.skipKubeconfig = startCmd.PersistentFlags().Bool(
		"skip-kubeconfig",
		false,
		"skip initialization of the kubeconfig",
	)

	opts.contexts = startCmd.PersistentFlags().StringArray(
		"contexts",
		nil,
		"the list of contexts to use (defaults to the current context)",
	)

	startCmd.PersistentFlags().StringVar(
		&opts.db,
		"db",
		"sqlite",
		"the db to use, one of sqlite or postgres",
	)

	startCmd.PersistentFlags().StringVar(
		&opts.kubeconfigPath,
		"kubeconfig",
		"",
		"path to kubeconfig",
	)

	startCmd.PersistentFlags().StringVar(
		&opts.imageTag,
		"image-tag",
		"latest",
		"the Porter image tag to use",
	)
}

func stop() error {
	agent, err := docker.NewAgentFromEnv()

	if err != nil {
		return err
	}

	err = agent.StopPorterContainersWithProcessID("main", false)

	if err != nil {
		return err
	}

	return nil
}

func start(
	imageTag string,
	kubeconfigPath string,
	db string,
	contexts []string,
	insecure bool,
	skipKubeconfig bool,
) error {
	var username, pw string
	var err error
	home := homedir.HomeDir()
	outputConfPath := filepath.Join(home, ".porter", "porter.kubeconfig")

	// if not insecure, or username/pw set incorrectly, prompt for new username/pw
	if username, pw, err = credstore.Get(); !insecure && err != nil {
		fmt.Println("Please register your admin account with an email and password:")

		username, err = promptPlaintext("Email: ")

		if err != nil {
			return err
		}

		pw, err = promptPasswordWithConfirmation()

		if err != nil {
			return err
		}

		credstore.Set(username, pw)
	}

	if !skipKubeconfig {
		err = generate(
			kubeconfigPath,
			outputConfPath,
			false,
			contexts,
		)

		if err != nil {
			return err
		}
	}

	env := make([]string, 0)

	env = append(env, []string{
		"ADMIN_INIT=true",
		"ADMIN_EMAIL=" + username,
		"ADMIN_PASSWORD=" + pw,
	}...)

	var porterDB docker.PorterDB

	switch db {
	case "postgres":
		porterDB = docker.Postgres
	case "sqlite":
		porterDB = docker.SQLite
	}

	port := 8080

	startOpts := &docker.PorterStartOpts{
		ProcessID:      "main",
		ServerImageTag: imageTag,
		ServerPort:     port,
		DB:             porterDB,
		KubeconfigPath: kubeconfigPath,
		SkipKubeconfig: skipKubeconfig,
		Env:            env,
	}

	_, _, err = docker.StartPorter(startOpts)

	fmt.Println("Spinning up the server...")
	time.Sleep(7 * time.Second)
	openBrowser(fmt.Sprintf("http://localhost:%d/login?email=%s", port, username))
	fmt.Printf("Server ready: listening on localhost:%d\n", port)

	return nil
}

// openBrowser opens the specified URL in the default browser of the user.
func openBrowser(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default: // "linux", "freebsd", "openbsd", "netbsd"
		cmd = "xdg-open"
	}
	args = append(args, url)
	return exec.Command(cmd, args...).Start()
}
