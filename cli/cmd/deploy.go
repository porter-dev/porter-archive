package cmd

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/spf13/cobra"
)

// deployCmd represents the "porter deploy" base command when called
// without any subcommands
var deployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Builds and deploys a specified application given by the --app flag.",
	Long: fmt.Sprintf(`
%s 

Builds and deploys a specified application given by the --app flag. For example:

  %s

If the application has a remote Git repository source configured, this command uses the latest commit 
from the remote repo and branch to deploy an application. It will use the latest commit as the image 
tag. 

To build from a local directory, you must specify the --local flag. The path can be configured via the 
--path flag. You can also overwrite the tag using the --tag flag. For example, to build from the 
local directory ~/path-to-dir with the tag "testing":

  %s

If your application is set up to use a Dockerfile by default, you can use a buildpack via the flag 
"--method pack". Conversely, if your application is set up to use a buildpack by default, you can 
use a Dockerfile by passing the flag "--method docker". You can specify the relative path to a Dockerfile 
in your remote Git repository. For example, if a Dockerfile is found at ./docker/prod.Dockerfile, you can 
specify it as follows:

  %s

If an application does not have a remote Git repository source, this command will attempt to use a 
cloud-native buildpack builder and build from the current directory. If this is the desired behavior,
you do not need to configure additional flags:

  %s

If you would like to build from a Dockerfile instead, use the flag --dockerfile and "--method docker"
as documented above. For example:

  %s
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter deploy\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy --app example-app"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy --app remote-git-app --local --path ~/path-to-dir --tag testing"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy --app remote-git-app --method docker --dockerfile ./docker/prod.Dockerfile"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy --app local-app"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy --app local-app --method docker --dockerfile ~/porter-test/prod.Dockerfile"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deployFull)

		if err != nil {
			os.Exit(1)
		}
	},
}

var deployGetEnvCmd = &cobra.Command{
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
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter deploy get-env\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy get-env --app example-app | xargs"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy get-env --app example-app --file .env"),
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
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter deploy build\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy build --app example-app"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy build --app example-app --method docker"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy build --app example-app --method docker --dockerfile ./prod.Dockerfile"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deployBuild)

		if err != nil {
			os.Exit(1)
		}
	},
}

var deployPushCmd = &cobra.Command{
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
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter deploy push\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy push --app nginx --tag new-tag"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deployPush)

		if err != nil {
			os.Exit(1)
		}
	},
}

var deployCallWebhookCmd = &cobra.Command{
	Use:   "call-webhook",
	Short: "Calls the webhook for an application specified by the --app flag.",
	Long: fmt.Sprintf(`
%s 

Calls the webhook for an application specified by the --app flag. This webhook will 
trigger a new deployment for the application, with the new image set. For example:

  %s

This command will by default call the webhook with image tag "latest," but you can 
specify a different tag with the --tag flag:

  %s
`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter deploy call-webhook\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy call-webhook --app example-app"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter deploy call-webhook --app example-app --tag custom-tag"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deployCallWebhook)

		if err != nil {
			os.Exit(1)
		}
	},
}

var app string
var getEnvFileDest string
var local bool
var localPath string
var tag string
var dockerfile string
var method string

func init() {
	rootCmd.AddCommand(deployCmd)

	deployCmd.PersistentFlags().StringVar(
		&app,
		"app",
		"",
		"Application in the Porter dashboard",
	)

	deployCmd.MarkPersistentFlagRequired("app")

	deployCmd.PersistentFlags().StringVar(
		&namespace,
		"namespace",
		"default",
		"Namespace of the application",
	)

	deployCmd.PersistentFlags().BoolVar(
		&local,
		"local",
		false,
		"Whether local context should be used for build",
	)

	deployCmd.PersistentFlags().StringVarP(
		&localPath,
		"path",
		"p",
		".",
		"If local build, the path to the build directory",
	)

	deployCmd.PersistentFlags().StringVarP(
		&tag,
		"tag",
		"t",
		"",
		"the specified tag to use, if not \"latest\"",
	)

	deployCmd.PersistentFlags().StringVar(
		&dockerfile,
		"dockerfile",
		"",
		"the path to the dockerfile",
	)

	deployCmd.PersistentFlags().StringVar(
		&method,
		"method",
		"",
		"the build method to use (\"docker\" or \"pack\")",
	)

	deployCmd.AddCommand(deployGetEnvCmd)

	deployGetEnvCmd.PersistentFlags().StringVar(
		&getEnvFileDest,
		"file",
		"",
		"file destination for .env files",
	)

	deployCmd.AddCommand(deployBuildCmd)
	deployCmd.AddCommand(deployPushCmd)
	deployCmd.AddCommand(deployCallWebhookCmd)
}

func deployFull(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Deploying app:", app)

	deployAgent, err := deployGetAgent(client)

	if err != nil {
		return err
	}

	err = deployBuildWithAgent(deployAgent)

	if err != nil {
		return err
	}

	err = deployPushWithAgent(deployAgent)

	if err != nil {
		return err
	}

	err = deployCallWebhookWithAgent(deployAgent)

	if err != nil {
		return err
	}

	return nil
}

func deployGetEnv(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	deployAgent, err := deployGetAgent(client)

	if err != nil {
		return err
	}

	buildEnv, err := deployAgent.GetBuildEnv()

	if err != nil {
		return err
	}

	// set the environment variables in the process
	err = deployAgent.SetBuildEnv(buildEnv)

	if err != nil {
		return err
	}

	// write the environment variables to either a file or stdout (stdout by default)
	return deployAgent.WriteBuildEnv(getEnvFileDest)
}

func deployBuild(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	deployAgent, err := deployGetAgent(client)

	if err != nil {
		return err
	}

	return deployBuildWithAgent(deployAgent)
}

func deployPush(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	deployAgent, err := deployGetAgent(client)

	if err != nil {
		return err
	}

	return deployPushWithAgent(deployAgent)
}

func deployCallWebhook(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	deployAgent, err := deployGetAgent(client)

	if err != nil {
		return err
	}

	return deployCallWebhookWithAgent(deployAgent)
}

// HELPER METHODS
func deployGetAgent(client *api.Client) (*deploy.DeployAgent, error) {
	var buildMethod deploy.DeployBuildType

	if method != "" {
		buildMethod = deploy.DeployBuildType(method)
	}

	// initialize the deploy agent
	return deploy.NewDeployAgent(client, app, &deploy.DeployOpts{
		ProjectID:       config.Project,
		ClusterID:       config.Cluster,
		Namespace:       namespace,
		Local:           local,
		LocalPath:       localPath,
		LocalDockerfile: dockerfile,
		OverrideTag:     tag,
		Method:          buildMethod,
	})
}

func deployBuildWithAgent(deployAgent *deploy.DeployAgent) error {
	// build the deployment
	color.New(color.FgGreen).Println("Building docker image for", app)

	buildEnv, err := deployAgent.GetBuildEnv()

	if err != nil {
		return err
	}

	// set the environment variables in the process
	err = deployAgent.SetBuildEnv(buildEnv)

	if err != nil {
		return err
	}

	return deployAgent.Build()
}

func deployPushWithAgent(deployAgent *deploy.DeployAgent) error {
	// push the deployment
	color.New(color.FgGreen).Println("Pushing new image for", app)

	return deployAgent.Push()
}

func deployCallWebhookWithAgent(deployAgent *deploy.DeployAgent) error {
	// push the deployment
	color.New(color.FgGreen).Println("Calling webhook for", app)

	err := deployAgent.CallWebhook()

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Println("Successfully re-deployed", app)

	return nil
}
