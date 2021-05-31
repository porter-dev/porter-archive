package cmd

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/spf13/cobra"
)

// deployCmd represents the "porter deploy" base command when called
// without any subcommands
var deployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Builds and deploys a specified application given by the --app flag.",
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
	Long: fmt.Sprintf(`Gets environment variables for a deployment for a specified application given by the --app flag.
By default, env variables are printed via stdout for use in downstream commands:

  %s

Output can also be written to a dotenv file via the --file flag, which should specify the destination
path for a .env file. For example:

  %s
`,
		color.New(color.FgGreen).Sprintf("porter deploy get-env --app <app>"),
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
	Short: "Builds a new version of the application specified by the --app flag.",
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, deployBuild)

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

func init() {
	rootCmd.AddCommand(deployCmd)

	deployCmd.PersistentFlags().StringVar(
		&app,
		"app",
		"",
		"Application in the Porter dashboard",
	)

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
		"If local build, the specified tag to use, if not \"latest\"",
	)

	deployCmd.AddCommand(deployGetEnvCmd)

	deployGetEnvCmd.PersistentFlags().StringVar(
		&getEnvFileDest,
		"file",
		"",
		"file destination for .env files",
	)

	deployCmd.AddCommand(deployBuildCmd)
}

func deployFull(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	color.New(color.FgGreen).Println("Deploying app:", app)

	// initialize the deploy agent
	deployAgent, err := deploy.NewDeployAgent(client, app, &deploy.DeployOpts{
		ProjectID:   config.Project,
		ClusterID:   config.Cluster,
		Namespace:   namespace,
		Local:       local,
		LocalPath:   localPath,
		OverrideTag: tag,
	})

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

	// build the deployment
	color.New(color.FgGreen).Println("Building docker image for", app)

	err = deployAgent.Build()

	if err != nil {
		return err
	}

	// push the deployment
	color.New(color.FgGreen).Println("Deploying new application for", app)

	err = deployAgent.Deploy()

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Println("Successfully deployed", app)

	return nil
}

func deployGetEnv(resp *api.AuthCheckResponse, client *api.Client, args []string) error {
	// initialize the deploy agent
	deployAgent, err := deploy.NewDeployAgent(client, app, &deploy.DeployOpts{
		ProjectID: config.Project,
		ClusterID: config.Cluster,
		Namespace: namespace,
	})

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
	color.New(color.FgGreen).Println("Building app:", app)

	// initialize the deploy agent
	deployAgent, err := deploy.NewDeployAgent(client, app, &deploy.DeployOpts{
		ProjectID: config.Project,
		ClusterID: config.Cluster,
		Namespace: namespace,
	})

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

	// build the deployment
	color.New(color.FgGreen).Println("Building docker image for", app)

	return deployAgent.Build()
}
