package cmd

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/spf13/cobra"
)

// updateCmd represents the "porter update" base command when called
// without any subcommands
var updateCmd = &cobra.Command{
	Use:   "update",
	Short: "Builds and updates a specified application given by the --app flag.",
	Long: fmt.Sprintf(`
%s 

Builds and updates a specified application given by the --app flag. For example:

  %s

This command will automatically build from a local path. The path can be configured via the 
--path flag. You can also overwrite the tag using the --tag flag. For example, to build from the 
local directory ~/path-to-dir with the tag "testing":

  %s

If the application has a remote Git repository source configured, you can specify that the remote
Git repository should be used to build the new image by specifying "--source github". Porter will use 
the latest commit from the remote repo and branch to update an application, and will use the latest 
commit as the image tag.

  %s

To add new configuration or update existing configuration, you can pass a values.yaml file in via the 
--values flag. For example;

  %s

If your application is set up to use a Dockerfile by default, you can use a buildpack via the flag 
"--method pack". Conversely, if your application is set up to use a buildpack by default, you can 
use a Dockerfile by passing the flag "--method docker". You can specify the relative path to a Dockerfile 
in your remote Git repository. For example, if a Dockerfile is found at ./docker/prod.Dockerfile, you can 
specify it as follows:

  %s
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter update\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update --app example-app"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update --app example-app --path ~/path-to-dir --tag testing"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update --app remote-git-app --source github"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update --app example-app --values my-values.yaml"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update --app example-app --method docker --dockerfile ./docker/prod.Dockerfile"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, updateFull)

		if err != nil {
			os.Exit(1)
		}
	},
}

var updateGetEnvCmd = &cobra.Command{
	Use:   "get-env",
	Short: "Gets environment variables for a deployment for a specified application given by the --app flag.",
	Long: fmt.Sprintf(`
%s 

Gets environment variables for a deployment for a specified application given by the --app 
flag. By default, env variables are printed via stdout for use in downstream commands:

  %s

Output can also be written to a file via the --file flag, which should specify the 
destination path for a .env file. For example:

  %s
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter update get-env\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update get-env --app example-app | xargs"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update get-env --app example-app --file .env"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, updateGetEnv)

		if err != nil {
			os.Exit(1)
		}
	},
}

var updateBuildCmd = &cobra.Command{
	Use:   "build",
	Short: "Builds a new version of the application specified by the --app flag.",
	Long: fmt.Sprintf(`
%s 

Builds a new version of the application specified by the --app flag. Depending on the 
configured settings, this command may work automatically or will require a specified 
--method flag. 

If you have configured the Dockerfile path and/or a build context for this application, 
this command will by default use those settings, so you just need to specify the --app 
flag:

  %s

If you have not linked the build-time requirements for this application, the command will
use a local build. By default, the cloud-native buildpacks builder will automatically be run 
from the current directory. If you would like to change the build method, you can do so by 
using the --method flag, for example:

  %s

When using "--method docker", you can specify the path to the Dockerfile using the 
--dockerfile flag. This will also override the Dockerfile path that you may have linked
for the application:

  %s
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter update build\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update build --app example-app"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update build --app example-app --method docker"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update build --app example-app --method docker --dockerfile ./prod.Dockerfile"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, updateBuild)

		if err != nil {
			os.Exit(1)
		}
	},
}

var updatePushCmd = &cobra.Command{
	Use:   "push",
	Short: "Pushes a new image for an application specified by the --app flag.",
	Long: fmt.Sprintf(`
%s 

Pushes a new image for an application specified by the --app flag. This command uses
the image repository saved in the application config by default. For example, if an 
application "nginx" was created from the image repo "gcr.io/snowflake-123456/nginx", 
the following command would push the image "gcr.io/snowflake-123456/nginx:new-tag":

  %s

This command will not use your pre-saved authentication set up via "docker login," so if you
are using an image registry that was created outside of Porter, make sure that you have 
linked it via "porter connect".
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter update push\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update push --app nginx --tag new-tag"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, updatePush)

		if err != nil {
			os.Exit(1)
		}
	},
}

var updateConfigCmd = &cobra.Command{
	Use:   "config",
	Short: "Updates the configuration for an application specified by the --app flag.",
	Long: fmt.Sprintf(`
%s 

Updates the configuration for an application specified by the --app flag, using the configuration
given by the --values flag. This will trigger a new deployment for the application with 
new configuration set. Note that this will merge your existing configuration with configuration
specified in the --values file. For example:

  %s

You can update the configuration with only a new tag with the --tag flag, which will only update
the image that the application uses if no --values file is specified:

  %s
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter update config\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update config --app example-app --values my-values.yaml"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update config --app example-app --tag custom-tag"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, updateUpgrade)

		if err != nil {
			os.Exit(1)
		}
	},
}

var app string
var getEnvFileDest string
var localPath string
var tag string
var dockerfile string
var method string

func init() {
	rootCmd.AddCommand(updateCmd)

	updateCmd.PersistentFlags().StringVar(
		&app,
		"app",
		"",
		"Application in the Porter dashboard",
	)

	updateCmd.MarkPersistentFlagRequired("app")

	updateCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"Namespace of the application",
	)

	updateCmd.PersistentFlags().StringVar(
		&source,
		"source",
		"local",
		"the type of source (\"local\" or \"github\")",
	)

	updateCmd.PersistentFlags().StringVarP(
		&localPath,
		"path",
		"p",
		".",
		"If local build, the path to the build directory",
	)

	updateCmd.PersistentFlags().StringVarP(
		&tag,
		"tag",
		"t",
		"",
		"the specified tag to use, if not \"latest\"",
	)

	updateCmd.PersistentFlags().StringVarP(
		&values,
		"values",
		"v",
		"",
		"Filepath to a values.yaml file",
	)

	updateCmd.PersistentFlags().StringVar(
		&dockerfile,
		"dockerfile",
		"",
		"the path to the dockerfile",
	)

	updateCmd.PersistentFlags().StringVar(
		&method,
		"method",
		"",
		"the build method to use (\"docker\" or \"pack\")",
	)

	updateCmd.AddCommand(updateGetEnvCmd)

	updateGetEnvCmd.PersistentFlags().StringVar(
		&getEnvFileDest,
		"file",
		"",
		"file destination for .env files",
	)

	updateCmd.AddCommand(updateBuildCmd)
	updateCmd.AddCommand(updatePushCmd)
	updateCmd.AddCommand(updateConfigCmd)
}

func updateFull(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Deploying app:", app)

	updateAgent, err := updateGetAgent(client)

	if err != nil {
		return err
	}

	err = updateBuildWithAgent(updateAgent)

	if err != nil {
		return err
	}

	err = updatePushWithAgent(updateAgent)

	if err != nil {
		return err
	}

	err = updateUpgradeWithAgent(updateAgent)

	if err != nil {
		return err
	}

	return nil
}

func updateGetEnv(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	updateAgent, err := updateGetAgent(client)

	if err != nil {
		return err
	}

	buildEnv, err := updateAgent.GetBuildEnv()

	if err != nil {
		return err
	}

	// set the environment variables in the process
	err = updateAgent.SetBuildEnv(buildEnv)

	if err != nil {
		return err
	}

	// write the environment variables to either a file or stdout (stdout by default)
	return updateAgent.WriteBuildEnv(getEnvFileDest)
}

func updateBuild(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	updateAgent, err := updateGetAgent(client)

	if err != nil {
		return err
	}

	return updateBuildWithAgent(updateAgent)
}

func updatePush(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	updateAgent, err := updateGetAgent(client)

	if err != nil {
		return err
	}

	return updatePushWithAgent(updateAgent)
}

func updateUpgrade(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	updateAgent, err := updateGetAgent(client)

	if err != nil {
		return err
	}

	return updateUpgradeWithAgent(updateAgent)
}

// HELPER METHODS
func updateGetAgent(client *api.Client) (*deploy.DeployAgent, error) {
	var buildMethod deploy.DeployBuildType

	if method != "" {
		buildMethod = deploy.DeployBuildType(method)
	}

	// initialize the update agent
	return deploy.NewDeployAgent(client, app, &deploy.DeployOpts{
		SharedOpts: &deploy.SharedOpts{
			ProjectID:       config.Project,
			ClusterID:       config.Cluster,
			Namespace:       namespace,
			LocalPath:       localPath,
			LocalDockerfile: dockerfile,
			OverrideTag:     tag,
			Method:          buildMethod,
		},
		Local: source != "github",
	})
}

func updateBuildWithAgent(updateAgent *deploy.DeployAgent) error {
	// build the deployment
	color.New(color.FgGreen).Println("Building docker image for", app)

	buildEnv, err := updateAgent.GetBuildEnv()

	if err != nil {
		return err
	}

	// set the environment variables in the process
	err = updateAgent.SetBuildEnv(buildEnv)

	if err != nil {
		return err
	}

	return updateAgent.Build()
}

func updatePushWithAgent(updateAgent *deploy.DeployAgent) error {
	// push the deployment
	color.New(color.FgGreen).Println("Pushing new image for", app)

	return updateAgent.Push()
}

func updateUpgradeWithAgent(updateAgent *deploy.DeployAgent) error {
	// push the deployment
	color.New(color.FgGreen).Println("Calling webhook for", app)

	// read the values if necessary
	valuesObj, err := readValuesFile()

	if err != nil {
		return err
	}

	err = updateAgent.UpdateImageAndValues(valuesObj)

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Println("Successfully updated", app)

	return nil
}
