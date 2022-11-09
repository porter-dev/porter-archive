package cmd

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/cli/cmd/utils"
	templaterUtils "github.com/porter-dev/porter/internal/templater/utils"
	"github.com/spf13/cobra"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/homedir"
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
	Short: "Pushes an image to a Docker registry linked to your Porter project.",
	Args:  cobra.MaximumNArgs(1),
	Long: fmt.Sprintf(`
%s

Pushes a local Docker image to a registry linked to your Porter project. This command
requires the project ID to be set either by using the %s command
or the --project flag. For example, to push a local nginx image:

  %s

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
		color.New(color.FgBlue).Sprintf("porter config set-project"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter update push gcr.io/snowflake-123456/nginx:1234567"),
		color.New(color.Bold).Sprintf("LEGACY USAGE:"),
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

var updateEnvGroupCmd = &cobra.Command{
	Use:     "env-group",
	Aliases: []string{"eg", "envgroup", "env-groups", "envgroups"},
	Short:   "Updates an environment group's variables, specified by the --name flag.",
	Run: func(cmd *cobra.Command, args []string) {
		color.New(color.FgRed).Fprintln(os.Stderr, "need to specify an operation to continue")
	},
}

var updateSetEnvGroupCmd = &cobra.Command{
	Use:   "set",
	Short: "Sets the desired value of an environment variable in an env group in the form VAR=VALUE.",
	Args:  cobra.MaximumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, updateSetEnvGroup)

		if err != nil {
			os.Exit(1)
		}
	},
}

var updateUnsetEnvGroupCmd = &cobra.Command{
	Use:   "unset",
	Short: "Removes an environment variable from an env group.",
	Args:  cobra.MinimumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, updateUnsetEnvGroup)

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
var stream bool
var buildFlagsEnv []string
var forcePush bool
var useCache bool
var version uint
var varType string
var normalEnvGroupVars []string
var secretEnvGroupVars []string
var waitForSuccessfulDeploy bool

func init() {
	buildFlagsEnv = []string{}
	rootCmd.AddCommand(updateCmd)

	updateCmd.PersistentFlags().StringVar(
		&app,
		"app",
		"",
		"Application in the Porter dashboard",
	)

	updateCmd.PersistentFlags().BoolVar(
		&useCache,
		"use-cache",
		false,
		"Whether to use cache (currently in beta)",
	)

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
		"",
		"If local build, the path to the build directory. If remote build, the relative path from the repository root to the build directory.",
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

	updateCmd.PersistentFlags().StringArrayVarP(
		&buildFlagsEnv,
		"env",
		"e",
		[]string{},
		"Build-time environment variable, in the form 'VAR=VALUE'. These are not available at image runtime.",
	)

	updateCmd.PersistentFlags().StringVar(
		&method,
		"method",
		"",
		"the build method to use (\"docker\" or \"pack\")",
	)

	updateCmd.PersistentFlags().BoolVar(
		&stream,
		"stream",
		false,
		"stream update logs to porter dashboard",
	)

	updateCmd.PersistentFlags().BoolVar(
		&forceBuild,
		"force-build",
		false,
		"set this to force build an image (images tagged with \"latest\" have this set by default)",
	)

	updateCmd.PersistentFlags().BoolVar(
		&forcePush,
		"force-push",
		false,
		"set this to force push an image (images tagged with \"latest\" have this set by default)",
	)

	updateCmd.PersistentFlags().MarkDeprecated("force-build", "--force-build is now deprecated")

	updateCmd.PersistentFlags().MarkDeprecated("force-push", "--force-push is now deprecated")

	updateCmd.PersistentFlags().BoolVar(
		&waitForSuccessfulDeploy,
		"wait",
		false,
		"set this to wait and be notified when a deployment is successful, otherwise time out",
	)

	updateCmd.AddCommand(updateGetEnvCmd)

	updateGetEnvCmd.PersistentFlags().StringVar(
		&getEnvFileDest,
		"file",
		"",
		"file destination for .env files",
	)

	updateGetEnvCmd.MarkPersistentFlagRequired("app")

	updateBuildCmd.MarkPersistentFlagRequired("app")

	updateConfigCmd.MarkPersistentFlagRequired("app")

	updateEnvGroupCmd.PersistentFlags().StringVar(
		&name,
		"name",
		"",
		"the name of the environment group",
	)

	updateEnvGroupCmd.PersistentFlags().UintVar(
		&version,
		"version",
		0,
		"the version of the environment group",
	)

	updateEnvGroupCmd.MarkPersistentFlagRequired("name")

	updateSetEnvGroupCmd.PersistentFlags().StringVar(
		&varType,
		"type",
		"normal",
		"the type of environment variable (either \"normal\" or \"secret\")",
	)

	updateSetEnvGroupCmd.PersistentFlags().StringArrayVarP(
		&normalEnvGroupVars,
		"normal",
		"n",
		[]string{},
		"list of variables to set, in the form VAR=VALUE",
	)

	updateSetEnvGroupCmd.PersistentFlags().StringArrayVarP(
		&secretEnvGroupVars,
		"secret",
		"s",
		[]string{},
		"list of secret variables to set, in the form VAR=VALUE",
	)

	updateEnvGroupCmd.AddCommand(updateSetEnvGroupCmd)
	updateEnvGroupCmd.AddCommand(updateUnsetEnvGroupCmd)

	updateCmd.AddCommand(updateBuildCmd)
	updateCmd.AddCommand(updatePushCmd)
	updateCmd.AddCommand(updateConfigCmd)
	updateCmd.AddCommand(updateEnvGroupCmd)
}

func updateFull(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
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

	if waitForSuccessfulDeploy {
		err := checkDeploymentStatus(client)

		if err != nil {
			return err
		}
	}

	return nil
}

func updateGetEnv(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	updateAgent, err := updateGetAgent(client)

	if err != nil {
		return err
	}

	buildEnv, err := updateAgent.GetBuildEnv(&deploy.GetBuildEnvOpts{
		UseNewConfig: false,
	})

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

func updateBuild(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	updateAgent, err := updateGetAgent(client)

	if err != nil {
		return err
	}

	return updateBuildWithAgent(updateAgent)
}

func updatePush(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	if app == "" {
		if len(args) == 0 {
			return fmt.Errorf("please provide the docker image name")
		}

		image := args[0]

		registries, err := client.ListRegistries(context.Background(), cliConf.Project)

		if err != nil {
			return err
		}

		regs := *registries
		regID := uint(0)

		for _, reg := range regs {
			if strings.Contains(image, reg.URL) {
				regID = reg.ID
				break
			}
		}

		if regID == 0 {
			return fmt.Errorf("could not find registry for image: %s", image)
		}

		err = client.CreateRepository(context.Background(), cliConf.Project, regID,
			&types.CreateRegistryRepositoryRequest{
				ImageRepoURI: strings.Split(image, ":")[0],
			},
		)

		if err != nil {
			return err
		}

		agent, err := docker.NewAgentWithAuthGetter(client, cliConf.Project)

		if err != nil {
			return err
		}

		err = agent.PushImage(image)

		if err != nil {
			return err
		}

		return nil
	}

	updateAgent, err := updateGetAgent(client)

	if err != nil {
		return err
	}

	return updatePushWithAgent(updateAgent)
}

func updateUpgrade(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	updateAgent, err := updateGetAgent(client)

	if err != nil {
		return err
	}

	err = updateUpgradeWithAgent(updateAgent)

	if err != nil {
		return err
	}

	if waitForSuccessfulDeploy {
		err := checkDeploymentStatus(client)

		if err != nil {
			return err
		}
	}

	return nil
}

func updateSetEnvGroup(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	if len(normalEnvGroupVars) == 0 && len(secretEnvGroupVars) == 0 && len(args) == 0 {
		return fmt.Errorf("please provide one or more variables to update")
	}

	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan")

	s.Suffix = fmt.Sprintf(" Fetching env group '%s' in namespace '%s'", name, namespace)
	s.Start()

	envGroupResp, err := client.GetEnvGroup(context.Background(), cliConf.Project, cliConf.Cluster, namespace,
		&types.GetEnvGroupRequest{
			Name: name, Version: version,
		},
	)

	s.Stop()

	if err != nil {
		return err
	}

	newEnvGroup := &types.CreateEnvGroupRequest{
		Name:      envGroupResp.Name,
		Variables: envGroupResp.Variables,
	}

	// first check for multiple variables being set using the -e or -s flags
	if len(normalEnvGroupVars) > 0 || len(secretEnvGroupVars) > 0 {
		for _, v := range normalEnvGroupVars {
			delete(newEnvGroup.Variables, v)

			key, value, err := validateVarValue(v)

			if err != nil {
				return err
			}

			newEnvGroup.Variables[key] = value
		}

		if len(secretEnvGroupVars) > 0 {
			newEnvGroup.SecretVariables = make(map[string]string)
		}

		for _, v := range secretEnvGroupVars {
			delete(newEnvGroup.Variables, v)

			key, value, err := validateVarValue(v)

			if err != nil {
				return err
			}

			newEnvGroup.SecretVariables[key] = value
		}

		s.Suffix = fmt.Sprintf(" Updating env group '%s' in namespace '%s'", name, namespace)
	} else { // legacy usage
		key, value, err := validateVarValue(args[0])

		if err != nil {
			return err
		}

		delete(newEnvGroup.Variables, key)

		if varType == "secret" {
			newEnvGroup.SecretVariables = make(map[string]string)
			newEnvGroup.SecretVariables[key] = value

			s.Suffix = fmt.Sprintf(" Adding new secret variable '%s' to env group '%s' in namespace '%s'", key, name, namespace)
		} else {
			newEnvGroup.Variables[key] = value

			s.Suffix = fmt.Sprintf(" Adding new variable '%s' to env group '%s' in namespace '%s'", key, name, namespace)
		}
	}

	s.Start()

	_, err = client.CreateEnvGroup(
		context.Background(), cliConf.Project, cliConf.Cluster, namespace, newEnvGroup,
	)

	s.Stop()

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Println("env group successfully updated")

	return nil
}

func validateVarValue(in string) (string, string, error) {
	key, value, found := strings.Cut(in, "=")

	if !found {
		return "", "", fmt.Errorf("%s is not in the form of VAR=VALUE", in)
	}

	return key, value, nil
}

func updateUnsetEnvGroup(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("required variable name")
	}

	s := spinner.New(spinner.CharSets[9], 100*time.Millisecond)
	s.Color("cyan")

	s.Suffix = fmt.Sprintf(" Fetching env group '%s' in namespace '%s'", name, namespace)
	s.Start()

	envGroupResp, err := client.GetEnvGroup(context.Background(), cliConf.Project, cliConf.Cluster, namespace,
		&types.GetEnvGroupRequest{
			Name: name, Version: version,
		},
	)

	s.Stop()

	if err != nil {
		return err
	}

	newEnvGroup := &types.CreateEnvGroupRequest{
		Name:      envGroupResp.Name,
		Variables: envGroupResp.Variables,
	}

	for _, v := range args {
		delete(newEnvGroup.Variables, v)
	}

	s.Suffix = fmt.Sprintf(" Removing variables from env group '%s' in namespace '%s'", name, namespace)

	s.Start()

	_, err = client.CreateEnvGroup(
		context.Background(), cliConf.Project, cliConf.Cluster, namespace, newEnvGroup,
	)

	s.Stop()

	if err != nil {
		return err
	}

	color.New(color.FgGreen).Println("env group successfully updated")

	return nil
}

// HELPER METHODS
func updateGetAgent(client *api.Client) (*deploy.DeployAgent, error) {
	var buildMethod deploy.DeployBuildType

	if method != "" {
		buildMethod = deploy.DeployBuildType(method)
	}

	// add additional env, if they exist
	additionalEnv := make(map[string]string)

	for _, buildEnv := range buildFlagsEnv {
		if strSplArr := strings.SplitN(buildEnv, "=", 2); len(strSplArr) >= 2 {
			additionalEnv[strSplArr[0]] = strSplArr[1]
		}
	}

	// initialize the update agent
	return deploy.NewDeployAgent(client, app, &deploy.DeployOpts{
		SharedOpts: &deploy.SharedOpts{
			ProjectID:       cliConf.Project,
			ClusterID:       cliConf.Cluster,
			Namespace:       namespace,
			LocalPath:       localPath,
			LocalDockerfile: dockerfile,
			OverrideTag:     tag,
			Method:          buildMethod,
			AdditionalEnv:   additionalEnv,
			UseCache:        useCache,
		},
		Local: source != "github",
	})
}

func updateBuildWithAgent(updateAgent *deploy.DeployAgent) error {
	// build the deployment
	color.New(color.FgGreen).Println("Building docker image for", app)

	if stream {
		updateAgent.StreamEvent(types.SubEvent{
			EventID: "build",
			Name:    "Build",
			Index:   100,
			Status:  types.EventStatusInProgress,
			Info:    "",
		})
	}

	if useCache {
		err := config.SetDockerConfig(updateAgent.Client)

		if err != nil {
			return err
		}
	}

	// read the values if necessary
	valuesObj, err := readValuesFile()
	if err != nil {
		return err
	}

	buildEnv, err := updateAgent.GetBuildEnv(&deploy.GetBuildEnvOpts{
		UseNewConfig: true,
		NewConfig:    valuesObj,
	})

	if err != nil {
		if stream {
			// another concern: is it safe to ignore the error here?
			updateAgent.StreamEvent(types.SubEvent{
				EventID: "build",
				Name:    "Build",
				Index:   110,
				Status:  types.EventStatusFailed,
				Info:    err.Error(),
			})
		}
		return err
	}

	// set the environment variables in the process
	err = updateAgent.SetBuildEnv(buildEnv)

	if err != nil {
		if stream {
			updateAgent.StreamEvent(types.SubEvent{
				EventID: "build",
				Name:    "Build",
				Index:   120,
				Status:  types.EventStatusFailed,
				Info:    err.Error(),
			})
		}
		return err
	}

	if err := updateAgent.Build(nil); err != nil {
		if stream {
			updateAgent.StreamEvent(types.SubEvent{
				EventID: "build",
				Name:    "Build",
				Index:   130,
				Status:  types.EventStatusFailed,
				Info:    err.Error(),
			})
		}
		return err
	}

	if stream {
		updateAgent.StreamEvent(types.SubEvent{
			EventID: "build",
			Name:    "Build",
			Index:   140,
			Status:  types.EventStatusSuccess,
			Info:    "",
		})
	}

	return nil
}

func updatePushWithAgent(updateAgent *deploy.DeployAgent) error {
	if useCache {
		color.New(color.FgGreen).Println("Skipping image push for", app, "as use-cache is set")

		return nil
	}

	// push the deployment
	color.New(color.FgGreen).Println("Pushing new image for", app)

	if stream {
		updateAgent.StreamEvent(types.SubEvent{
			EventID: "push",
			Name:    "Push",
			Index:   200,
			Status:  types.EventStatusInProgress,
			Info:    "",
		})
	}

	if err := updateAgent.Push(); err != nil {
		if stream {
			updateAgent.StreamEvent(types.SubEvent{
				EventID: "push",
				Name:    "Push",
				Index:   210,
				Status:  types.EventStatusFailed,
				Info:    err.Error(),
			})
		}
		return err
	}

	if stream {
		updateAgent.StreamEvent(types.SubEvent{
			EventID: "push",
			Name:    "Push",
			Index:   220,
			Status:  types.EventStatusSuccess,
			Info:    "",
		})
	}

	return nil
}

func updateUpgradeWithAgent(updateAgent *deploy.DeployAgent) error {
	// push the deployment
	color.New(color.FgGreen).Println("Upgrading configuration for", app)

	if stream {
		updateAgent.StreamEvent(types.SubEvent{
			EventID: "upgrade",
			Name:    "Upgrade",
			Index:   300,
			Status:  types.EventStatusInProgress,
			Info:    "",
		})
	}

	var err error

	// read the values if necessary
	valuesObj, err := readValuesFile()
	if err != nil {
		return err
	}

	if err != nil {
		if stream {
			updateAgent.StreamEvent(types.SubEvent{
				EventID: "upgrade",
				Name:    "Upgrade",
				Index:   310,
				Status:  types.EventStatusFailed,
				Info:    err.Error(),
			})
		}
		return err
	}

	if len(updateAgent.Opts.AdditionalEnv) > 0 {
		syncedEnv, err := deploy.GetSyncedEnv(
			updateAgent.Client,
			updateAgent.Release.Config,
			updateAgent.Opts.ProjectID,
			updateAgent.Opts.ClusterID,
			updateAgent.Opts.Namespace,
			false,
		)

		if err != nil {
			return err
		}

		for k := range updateAgent.Opts.AdditionalEnv {
			if _, ok := syncedEnv[k]; ok {
				return fmt.Errorf("environment variable %s already exists as part of a synced environment group", k)
			}
		}

		normalEnv, err := deploy.GetNormalEnv(
			updateAgent.Client,
			updateAgent.Release.Config,
			updateAgent.Opts.ProjectID,
			updateAgent.Opts.ClusterID,
			updateAgent.Opts.Namespace,
			false,
		)

		if err != nil {
			return err
		}

		// add the additional environment variables to container.env.normal
		for k, v := range updateAgent.Opts.AdditionalEnv {
			normalEnv[k] = v
		}

		valuesObj = templaterUtils.CoalesceValues(valuesObj, map[string]interface{}{
			"container": map[string]interface{}{
				"env": map[string]interface{}{
					"normal": normalEnv,
				},
			},
		})
	}

	err = updateAgent.UpdateImageAndValues(valuesObj)

	if err != nil {
		if stream {
			updateAgent.StreamEvent(types.SubEvent{
				EventID: "upgrade",
				Name:    "Upgrade",
				Index:   320,
				Status:  types.EventStatusFailed,
				Info:    err.Error(),
			})
		}
		return err
	}

	if stream {
		updateAgent.StreamEvent(types.SubEvent{
			EventID: "upgrade",
			Name:    "Upgrade",
			Index:   330,
			Status:  types.EventStatusSuccess,
			Info:    "",
		})
	}

	color.New(color.FgGreen).Println("Successfully updated", app)

	return nil
}

func checkDeploymentStatus(client *api.Client) error {
	color.New(color.FgBlue).Println("waiting for deployment to be ready, this may take a few minutes and will time out if it takes longer than 30 minutes")

	sharedConf := &PorterRunSharedConfig{
		Client: client,
	}

	err := sharedConf.setSharedConfig()

	if err != nil {
		return fmt.Errorf("could not retrieve kubernetes credentials: %w", err)
	}

	prevRefresh := time.Now()
	timeWait := prevRefresh.Add(30 * time.Minute)
	success := false

	depls, err := sharedConf.Clientset.AppsV1().Deployments(namespace).List(
		context.Background(),
		metav1.ListOptions{
			LabelSelector: fmt.Sprintf("app.kubernetes.io/instance=%s", app),
		},
	)

	if err != nil {
		return fmt.Errorf("could not get deployments for app %s: %w", app, err)
	}

	if len(depls.Items) == 0 {
		return fmt.Errorf("could not find any deployments for app %s", app)
	}

	sort.Slice(depls.Items, func(i, j int) bool {
		return depls.Items[i].CreationTimestamp.After(depls.Items[j].CreationTimestamp.Time)
	})

	depl := depls.Items[0]

	// determine if the deployment has an appropriate number of ready replicas
	minAvailable := *(depl.Spec.Replicas) - getMaxUnavailable(depl)

	var revision string

	for k, v := range depl.Spec.Template.ObjectMeta.Annotations {
		if k == "helm.sh/revision" {
			revision = v
			break
		}
	}

	if revision == "" {
		return fmt.Errorf("could not find revision for deployment")
	}

	pods, err := sharedConf.Clientset.CoreV1().Pods(namespace).List(
		context.Background(), metav1.ListOptions{
			LabelSelector: fmt.Sprintf("app.kubernetes.io/instance=%s", app),
		},
	)

	if err != nil {
		return fmt.Errorf("error fetching pods for app %s: %w", app, err)
	}

	if len(pods.Items) == 0 {
		return fmt.Errorf("could not find any pods for app %s", app)
	}

	var rsName string

	for _, pod := range pods.Items {
		if pod.ObjectMeta.Annotations["helm.sh/revision"] == revision {
			for _, ref := range pod.OwnerReferences {
				if ref.Kind == "ReplicaSet" {
					rs, err := sharedConf.Clientset.AppsV1().ReplicaSets(namespace).Get(
						context.Background(),
						ref.Name,
						metav1.GetOptions{},
					)

					if err != nil {
						return fmt.Errorf("error fetching new replicaset: %w", err)
					}

					rsName = rs.Name

					break
				}
			}

			if rsName != "" {
				break
			}
		}
	}

	if rsName == "" {
		return fmt.Errorf("could not find replicaset for app %s", app)
	}

	for time.Now().Before(timeWait) {
		// refresh the client every 10 minutes
		if time.Now().After(prevRefresh.Add(10 * time.Minute)) {
			err = sharedConf.setSharedConfig()

			if err != nil {
				return fmt.Errorf("could not retrieve kube credentials: %s", err.Error())
			}

			prevRefresh = time.Now()
		}

		rs, err := sharedConf.Clientset.AppsV1().ReplicaSets(namespace).Get(
			context.Background(),
			rsName,
			metav1.GetOptions{},
		)

		if err != nil {
			return fmt.Errorf("error fetching new replicaset: %w", err)
		}

		if minAvailable <= rs.Status.ReadyReplicas {
			success = true
		}

		if success {
			break
		}

		time.Sleep(2 * time.Second)
	}

	if success {
		color.New(color.FgGreen).Printf("%s has been successfully deployed on the cluster\n", app)
	} else {
		return fmt.Errorf("timed out waiting for deployment to be ready, please check the Porter dashboard for more information")
	}

	return nil
}
