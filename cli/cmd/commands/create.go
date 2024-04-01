package commands

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	v2 "github.com/porter-dev/porter/cli/cmd/v2"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/cli/cmd/gitutils"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/cobra"
	"k8s.io/client-go/util/homedir"
	"sigs.k8s.io/yaml"
)

var (
	name        string
	values      string
	source      string
	image       string
	registryURL string
	forceBuild  bool
)

func registerCommand_Create(cliConf config.CLIConfig) *cobra.Command {
	createCmd := &cobra.Command{
		Use:   "create [kind]",
		Args:  cobra.ExactArgs(1),
		Short: "Creates a new application with name given by the --app flag.",
		Long: fmt.Sprintf(`
%s

Creates a new application with name given by the --app flag and a "kind", which can be one of
web, worker, or job. For example:

  %s

To modify the default configuration of the application, you can pass a values.yaml file in via the
--values flag.

  %s

To read more about the configuration options, go here:

https://docs.porter.run/docs/deploying-from-the-cli#common-configuration-options

This command will automatically build from a local path, and will create a new Docker image in your
default Docker registry. The path can be configured via the --path flag. For example:

  %s

To connect the application to Github, so that the application rebuilds and redeploys on each push
to a Github branch, you can specify "--source github". If your local branch is set to track changes
from an upstream remote branch, Porter will try to use the connected remote and remote branch as the
Github repository to link to. Otherwise, Porter will use the remote given by origin. For example:

  %s

To deploy an application from a Docker registry, use "--source registry" and pass the image in via the
--image flag. The image flag must be of the form repository:tag. For example:

  %s
`,
			color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter create\":"),
			color.New(color.FgGreen, color.Bold).Sprintf("porter create web --app example-app"),
			color.New(color.FgGreen, color.Bold).Sprintf("porter create web --app example-app --values values.yaml"),
			color.New(color.FgGreen, color.Bold).Sprintf("porter create web --app example-app --path ./path/to/app"),
			color.New(color.FgGreen, color.Bold).Sprintf("porter create web --app example-app --source github"),
			color.New(color.FgGreen, color.Bold).Sprintf("porter create web --app example-app --source registry --image gcr.io/snowflake-12345/example-app:latest"),
		),
		Run: func(cmd *cobra.Command, args []string) {
			err := checkLoginAndRunWithConfig(cmd, cliConf, args, createFull)
			if err != nil {
				os.Exit(1)
			}
		},
	}

	createCmd.PersistentFlags().StringVar(
		&name,
		"app",
		"",
		"name of the new application/job/worker.",
	)

	createCmd.MarkPersistentFlagRequired("app")

	createCmd.PersistentFlags().StringVarP(
		&localPath,
		"path",
		"p",
		"",
		"if local build, the path to the build directory",
	)

	createCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"namespace of the application",
	)

	createCmd.PersistentFlags().StringVarP(
		&values,
		"values",
		"v",
		"",
		"filepath to a values.yaml file",
	)

	createCmd.PersistentFlags().StringVar(
		&dockerfile,
		"dockerfile",
		"",
		"the path to the dockerfile",
	)

	createCmd.PersistentFlags().StringArrayVarP(
		&buildFlagsEnv,
		"env",
		"e",
		[]string{},
		"Build-time environment variable, in the form 'VAR=VALUE'. These are not available at image runtime.",
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
		"the type of source (\"local\", \"github\", or \"registry\")",
	)

	createCmd.PersistentFlags().StringVar(
		&image,
		"image",
		"",
		"if the source is \"registry\", the image to use, in repository:tag format",
	)

	createCmd.PersistentFlags().StringVar(
		&registryURL,
		"registry-url",
		"",
		"the registry URL to use (must exist in \"porter registries list\")",
	)

	createCmd.PersistentFlags().BoolVar(
		&forceBuild,
		"force-build",
		false,
		"set this to force build an image",
	)

	createCmd.PersistentFlags().BoolVar(
		&useCache,
		"use-cache",
		false,
		"Whether to use cache (currently in beta)",
	)

	createCmd.PersistentFlags().MarkDeprecated("force-build", "--force-build is deprecated")
	return createCmd
}

var supportedKinds = map[string]string{"web": "", "job": "", "worker": ""}

func createFull(ctx context.Context, _ *types.GetAuthenticatedUserResponse, client api.Client, cliConf config.CLIConfig, featureFlags config.FeatureFlags, cmd *cobra.Command, args []string) error {
	if featureFlags.ValidateApplyV2Enabled {
		err := v2.CreateFull(ctx)
		if err != nil {
			return err
		}
		return nil
	}

	// check the kind
	if _, exists := supportedKinds[args[0]]; !exists {
		return fmt.Errorf("%s is not a supported type: specify web, job, or worker", args[0])
	}

	fullPath, err := filepath.Abs(localPath)
	if err != nil {
		return err
	}

	if os.Getenv("GITHUB_ACTIONS") == "" && source == "local" && fullPath == homedir.HomeDir() {
		proceed, err := utils.PromptConfirm("You are deploying your home directory. Do you want to continue?", false)
		if err != nil {
			return err
		}

		if !proceed {
			return nil
		}
	}

	// read the values if necessary
	valuesObj, err := readValuesFile()
	if err != nil {
		return err
	}

	color.New(color.FgGreen).Printf("Creating %s release: %s\n", args[0], name)

	var buildMethod deploy.DeployBuildType

	if method != "" {
		buildMethod = deploy.DeployBuildType(method)
	} else if dockerfile != "" {
		buildMethod = deploy.DeployBuildTypeDocker
	}

	// add additional env, if they exist
	additionalEnv := make(map[string]string)

	for _, buildEnv := range buildFlagsEnv {
		if strSplArr := strings.SplitN(buildEnv, "=", 2); len(strSplArr) >= 2 {
			additionalEnv[strSplArr[0]] = strSplArr[1]
		}
	}

	createAgent := &deploy.CreateAgent{
		Client: client,
		CreateOpts: &deploy.CreateOpts{
			SharedOpts: &deploy.SharedOpts{
				ProjectID:       cliConf.Project,
				ClusterID:       cliConf.Cluster,
				Namespace:       namespace,
				LocalPath:       fullPath,
				LocalDockerfile: dockerfile,
				Method:          buildMethod,
				AdditionalEnv:   additionalEnv,
				UseCache:        useCache,
			},
			Kind:        args[0],
			ReleaseName: name,
			RegistryURL: registryURL,
		},
	}

	if source == "local" {
		if useCache {
			regID, imageURL, err := createAgent.GetImageRepoURL(ctx, name, namespace)
			if err != nil {
				return err
			}

			err = client.CreateRepository(
				ctx,
				cliConf.Project,
				regID,
				&types.CreateRegistryRepositoryRequest{
					ImageRepoURI: imageURL,
				},
			)

			if err != nil {
				return err
			}

			err = config.SetDockerConfig(ctx, createAgent.Client, cliConf.Project)

			if err != nil {
				return err
			}
		}

		subdomain, err := createAgent.CreateFromDocker(ctx, valuesObj, "default", nil)

		return handleSubdomainCreate(subdomain, err)
	} else if source == "github" {
		return createFromGithub(ctx, createAgent, valuesObj)
	}

	subdomain, err := createAgent.CreateFromRegistry(ctx, image, valuesObj)

	return handleSubdomainCreate(subdomain, err)
}

func handleSubdomainCreate(subdomain string, err error) error {
	if err != nil {
		return err
	}

	if subdomain != "" {
		color.New(color.FgGreen).Printf("Your web application is ready at: %s\n", subdomain)
	} else {
		color.New(color.FgGreen).Printf("Application created successfully\n")
	}

	return nil
}

func createFromGithub(ctx context.Context, createAgent *deploy.CreateAgent, overrideValues map[string]interface{}) error {
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
	} else if gitBranch == "" {
		return fmt.Errorf("git branch not automatically detectable")
	}

	ok, remoteRepo := gitutils.ParseGithubRemote(remote)

	if !ok {
		return fmt.Errorf("remote is not a Github repository")
	}

	subdomain, err := createAgent.CreateFromGithub(
		ctx,
		&deploy.GithubOpts{
			Branch: gitBranch,
			Repo:   remoteRepo,
		}, overrideValues)

	return handleSubdomainCreate(subdomain, err)
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
