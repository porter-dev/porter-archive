package cmd

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/cli/cmd/gitutils"
	"github.com/spf13/cobra"
	"sigs.k8s.io/yaml"
)

// createCmd represents the "porter create" base command when called
// without any subcommands
var createCmd = &cobra.Command{
	Use:   "create [kind]",
	Args:  cobra.ExactArgs(1),
	Short: "TODO.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, createFull)

		if err != nil {
			os.Exit(1)
		}
	},
}

var name string
var values string
var source string

func init() {
	rootCmd.AddCommand(createCmd)

	createCmd.PersistentFlags().StringVar(
		&name,
		"name",
		"",
		"Name of the new application/job/worker.",
	)

	createCmd.MarkPersistentFlagRequired("name")

	createCmd.PersistentFlags().BoolVar(
		&local,
		"local",
		true,
		"Whether local context should be used for build",
	)

	createCmd.PersistentFlags().StringVarP(
		&localPath,
		"path",
		"p",
		".",
		"If local build, the path to the build directory",
	)

	createCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"Namespace of the application",
	)

	createCmd.PersistentFlags().StringVarP(
		&values,
		"values",
		"v",
		"",
		"Filepath to a values.yaml file",
	)

	createCmd.PersistentFlags().StringVar(
		&dockerfile,
		"dockerfile",
		"",
		"the path to the dockerfile",
	)

	createCmd.PersistentFlags().StringVar(
		&method,
		"method",
		"",
		"the build method to use (\"docker\" or \"pack\")",
	)

	createCmd.PersistentFlags().StringVar(
		&source,
		"source",
		"local",
		"the type of source (\"local\" or \"github\")",
	)
}

var supportedKinds = map[string]string{"web": "", "job": "", "worker": ""}

func createFull(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	// check the kind
	if _, exists := supportedKinds[args[0]]; !exists {
		return fmt.Errorf("%s is not a supported type: specify web, job, or worker", args[0])
	}

	// read the values if necessary
	valuesObj, err := readValuesFile()

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Printf("Creating %s release: %s\n", args[0], name)

	fullPath, err := filepath.Abs(localPath)

	if err != nil {
		return err
	}

	var buildMethod deploy.DeployBuildType

	if method != "" {
		buildMethod = deploy.DeployBuildType(method)
	} else if dockerfile != "" {
		buildMethod = deploy.DeployBuildTypeDocker
	}

	createAgent := &deploy.CreateAgent{
		Client: client,
		CreateOpts: &deploy.CreateOpts{
			SharedOpts: &deploy.SharedOpts{
				ProjectID:       config.Project,
				ClusterID:       config.Cluster,
				Namespace:       namespace,
				LocalPath:       fullPath,
				LocalDockerfile: dockerfile,
				Method:          buildMethod,
			},
			Kind:        args[0],
			ReleaseName: name,
		},
	}

	if source == "local" {
		subdomain, err := createAgent.CreateFromDocker(valuesObj)

		if err != nil {
			return err
		}

		color.New(color.FgGreen).Printf("Your web application is ready at: %s\n", subdomain)
	} else {
		return createFromGithub(createAgent, valuesObj)
	}

	return nil
}

func createFromGithub(createAgent *deploy.CreateAgent, overrideValues map[string]interface{}) error {
	fullPath, err := filepath.Abs(localPath)

	if err != nil {
		return err
	}

	_, err = gitutils.GitDirectory(fullPath)

	if err != nil {
		return err
	}

	remote, gitBranch, err := gitutils.GetRemoteBranch(fullPath)

	if err != nil {
		return err
	}

	ok, remoteRepo := gitutils.ParseGithubRemote(remote)

	if !ok {
		return fmt.Errorf("remote is not a Github repository")
	}

	subdomain, err := createAgent.CreateFromGithub(&deploy.GithubOpts{
		Branch: gitBranch,
		Repo:   remoteRepo,
	}, overrideValues)

	color.New(color.FgGreen).Printf("Your web application is ready at: %s\n", subdomain)

	return err
}

func readValuesFile() (map[string]interface{}, error) {
	res := make(map[string]interface{})

	if values == "" {
		return res, nil
	}

	valuesFilePath, err := filepath.Abs(values)

	if err != nil {
		return nil, err
	}

	if info, err := os.Stat(valuesFilePath); os.IsNotExist(err) || info.IsDir() {
		return nil, fmt.Errorf("values file does not exist or is a directory")
	}

	reader, err := os.Open(valuesFilePath)

	if err != nil {
		return nil, err
	}

	bytes, err := ioutil.ReadAll(reader)

	if err != nil {
		return nil, err
	}

	err = yaml.Unmarshal(bytes, &res)

	if err != nil {
		return nil, err
	}

	return res, nil
}
