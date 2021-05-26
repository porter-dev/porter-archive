package cmd

import (
	"context"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/cli/cmd/github"
	"github.com/spf13/cobra"
)

var app = ""

// deployCmd represents the "porter deploy" base command when called
// without any subcommands
var deployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Builds and deploys a specified application given by the --app flag.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deploy)

		if err != nil {
			os.Exit(1)
		}
	},
}

var deployInitCmd = &cobra.Command{
	Use:   "init",
	Short: "Initializes a deployment for a specified application given by the --app flag.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deployInit)

		if err != nil {
			os.Exit(1)
		}
	},
}

var getEnvFileDest = ""

var deployGetEnvCmd = &cobra.Command{
	Use:   "get-env",
	Short: "Gets environment variables for a deployment for a specified application given by the --app flag.",
	Long: fmt.Sprintf(`Gets environment variables for a deployment for a specified application given by the --app flag. 
By default, env variables are printed via stdout for use in downstream commands, for example:
	
  %s
	
Output can also be written to a dotenv file via the --file flag, which should specify the destination
path for a .env file. For example:

  %s
`,
		color.New(color.FgGreen).Sprintf("porter deploy get-env --app <app> | xargs"),
		color.New(color.FgGreen).Sprintf("porter deploy get-env --app <app> --file .env"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deployGetEnv)

		if err != nil {
			os.Exit(1)
		}
	},
}

var deployBuildCmd = &cobra.Command{
	Use:   "build",
	Short: "TBD",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deployBuild)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(deployCmd)

	deployCmd.PersistentFlags().StringVar(
		&app,
		"app",
		"",
		"Application in the Porter dashboard",
	)

	deployCmd.AddCommand(deployInitCmd)
	deployCmd.AddCommand(deployGetEnvCmd)

	deployGetEnvCmd.PersistentFlags().StringVar(
		&getEnvFileDest,
		"file",
		"",
		"file destination for .env files",
	)

	deployCmd.AddCommand(deployBuildCmd)
}

func deploy(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Deploying app:", app)

	return deployInit(resp, client, args)
}

var release *api.GetReleaseResponse = nil

// deployInit first reads the release given by the --app or the --job flag. It then
// configures docker with the registries linked to the project.
func deployInit(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	pID := config.Project
	cID := config.Cluster

	var err error

	release, err = client.GetRelease(context.TODO(), pID, cID, namespace, app)

	if err != nil {
		return err
	}

	return dockerConfig(resp, client, args)
}

// deployGetEnv retrieves the env from a release and outputs it to either a file
// or stdout depending on getEnvFileDest
func deployGetEnv(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	if release == nil {
		err := deployInit(resp, client, args)

		if err != nil {
			return err
		}
	}

	prefix, err := deploySetEnv(client)

	if err != nil {
		return err
	}

	// join lines together
	lines := make([]string, 0)

	// use os.Environ to get output already formatted as KEY=value
	for _, line := range os.Environ() {
		// filter for PORTER_<RELEASE> and strip prefix
		if strings.Contains(line, prefix+"_") {
			lines = append(lines, strings.Split(line, prefix+"_")[1])
		}
	}

	output := strings.Join(lines, "\n")

	// case on output type
	if getEnvFileDest != "" {
		ioutil.WriteFile(getEnvFileDest, []byte(output), 0700)
	} else {
		fmt.Println(output)
	}

	return nil
}

func deploySetEnv(client *api.Client) (prefix string, err error) {
	prefix = fmt.Sprintf("PORTER_%s", strings.Replace(
		strings.ToUpper(app), "-", "_", -1,
	))

	envVars, err := getEnvFromRelease()

	if err != nil {
		return prefix, err
	}

	// iterate through env and set the environment variables for the process
	// these are prefixed with PORTER_<RELEASE> to avoid collisions
	for key, val := range envVars {
		prefixedKey := fmt.Sprintf("%s_%s", prefix, key)

		err := os.Setenv(prefixedKey, val)

		if err != nil {
			return prefix, err
		}
	}

	return prefix, nil
}

func getEnvFromRelease() (map[string]string, error) {
	envConfig, err := getNestedMap(release.Config, "container", "env", "normal")

	// if the field is not found, set envConfig to an empty map; this release has no env set
	if e := (&NestedMapFieldNotFoundError{}); errors.As(err, &e) {
		envConfig = make(map[string]interface{})
	} else if err != nil {
		return nil, fmt.Errorf("could not get environment variables from release: %s", err.Error())
	}

	mapEnvConfig := make(map[string]string)

	for key, val := range envConfig {
		valStr, ok := val.(string)

		if !ok {
			return nil, fmt.Errorf("could not cast environment variables to object")
		}

		mapEnvConfig[key] = valStr
	}

	return mapEnvConfig, nil
}

type NestedMapFieldNotFoundError struct {
	Field string
}

func (e *NestedMapFieldNotFoundError) Error() string {
	return fmt.Sprintf("could not find field %s in configuration", e.Field)
}

func getNestedMap(obj map[string]interface{}, fields ...string) (map[string]interface{}, error) {
	var res map[string]interface{}
	curr := obj

	for _, field := range fields {
		objField, ok := curr[field]

		if !ok {
			return nil, &NestedMapFieldNotFoundError{field}
		}

		res, ok = objField.(map[string]interface{})

		if !ok {
			return nil, fmt.Errorf("%s is not a nested object", field)
		}

		curr = res
	}

	return res, nil
}

func deployBuild(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	if release == nil {
		err := deployInit(resp, client, args)

		if err != nil {
			return err
		}
	}

	zipResp, err := client.GetRepoZIPDownloadURL(
		context.Background(),
		config.Project,
		release.GitActionConfig,
	)

	if err != nil {
		return err
	}

	// download the repository from remote source into a temp directory
	dst, err := downloadRepoToDir(zipResp.URLString)

	if err != nil {
		return err
	}

	agent, err := docker.NewAgentFromEnv()

	if err != nil {
		return err
	}

	err = pullCurrentReleaseImage(agent)

	if err != nil {
		return err
	}

	// case on Dockerfile path
	if release.GitActionConfig.DockerfilePath != "" {
		return agent.BuildLocal(
			release.GitActionConfig.DockerfilePath,
			release.GitActionConfig.ImageRepoURI,
			dst,
		)
	}

	return nil
}

func pullCurrentReleaseImage(agent *docker.Agent) error {
	// pull the currently deployed image to use cache, if possible
	imageConfig, err := getNestedMap(release.Config, "image")

	if err != nil {
		return fmt.Errorf("could not get image config from release: %s", err.Error())
	}

	tagInterface, ok := imageConfig["tag"]

	if !ok {
		return fmt.Errorf("tag field does not exist for image")
	}

	tagStr, ok := tagInterface.(string)

	if !ok {
		return fmt.Errorf("could not cast image.tag field to string")
	}

	return agent.PullImage(fmt.Sprintf("%s:%s", release.GitActionConfig.ImageRepoURI, tagStr))
}

func downloadRepoToDir(downloadURL string) (string, error) {
	dstDir := filepath.Join(home, ".porter")

	downloader := &github.ZIPDownloader{
		ZipFolderDest:       dstDir,
		AssetFolderDest:     dstDir,
		ZipName:             fmt.Sprintf("%s.zip", strings.Replace(release.GitActionConfig.GitRepo, "/", "-", 1)),
		RemoveAfterDownload: true,
	}

	err := downloader.DownloadToFile(downloadURL)

	if err != nil {
		return "", fmt.Errorf("Error downloading to file: %s", err.Error())
	}

	err = downloader.UnzipToDir()

	if err != nil {
		return "", fmt.Errorf("Error unzipping to directory: %s", err.Error())
	}

	var res string

	dstFiles, err := ioutil.ReadDir(dstDir)

	for _, info := range dstFiles {
		if info.Mode().IsDir() && strings.Contains(info.Name(), strings.Replace(release.GitActionConfig.GitRepo, "/", "-", 1)) {
			res = filepath.Join(dstDir, info.Name())
		}
	}

	if res == "" {
		return "", fmt.Errorf("unzipped file not found on host")
	}

	return res, nil
}
