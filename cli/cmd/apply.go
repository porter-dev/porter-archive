package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/cli/cli/git"
	"github.com/fatih/color"
	"github.com/mitchellh/mapstructure"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/cli/cmd/deploy/wait"
	"github.com/porter-dev/porter/cli/cmd/preview"
	previewInt "github.com/porter-dev/porter/internal/integrations/preview"
	"github.com/porter-dev/porter/internal/templater/utils"
	"github.com/porter-dev/switchboard/pkg/drivers"
	switchboardModels "github.com/porter-dev/switchboard/pkg/models"
	"github.com/porter-dev/switchboard/pkg/parser"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
	switchboardWorker "github.com/porter-dev/switchboard/pkg/worker"
	"github.com/rs/zerolog"
	"github.com/spf13/cobra"
)

// applyCmd represents the "porter apply" base command when called
// with a porter.yaml file as an argument
var applyCmd = &cobra.Command{
	Use:   "apply",
	Short: "Applies a configuration to an application",
	Long: fmt.Sprintf(`
%s

Applies a configuration to an application by either creating a new one or updating an existing
one. For example:

  %s

This command will apply the configuration contained in porter.yaml to the requested project and
cluster either provided inside the porter.yaml file or through environment variables. Note that
environment variables will always take precendence over values specified in the porter.yaml file.

By default, this command expects to be run from a local git repository.

The following are the environment variables that can be used to set certain values while
applying a configuration:
  PORTER_CLUSTER              Cluster ID that contains the project
  PORTER_PROJECT              Project ID that contains the application
  PORTER_NAMESPACE            The Kubernetes namespace that the application belongs to
  PORTER_SOURCE_NAME          Name of the source Helm chart
  PORTER_SOURCE_REPO          The URL of the Helm charts registry
  PORTER_SOURCE_VERSION       The version of the Helm chart to use
  PORTER_TAG                  The Docker image tag to use (like the git commit hash)
	`,
		color.New(color.FgBlue, color.Bold).Sprintf("Help for \"porter apply\":"),
		color.New(color.FgGreen, color.Bold).Sprintf("porter apply -f porter.yaml"),
	),
	Run: func(cmd *cobra.Command, args []string) {
		err := checkLoginAndRun(args, apply)

		if err != nil {
			if strings.Contains(err.Error(), "Forbidden") {
				color.New(color.FgRed).Fprintf(os.Stderr, "You may have to update your GitHub secret token")
			}

			os.Exit(1)
		}
	},
}

// applyValidateCmd represents the "porter apply validate" command when called
// with a porter.yaml file as an argument
var applyValidateCmd = &cobra.Command{
	Use:   "validate",
	Short: "Validates a porter.yaml",
	Run: func(*cobra.Command, []string) {
		err := applyValidate()

		if err != nil {
			color.New(color.FgRed).Fprintf(os.Stderr, "Error: %s\n", err.Error())
			os.Exit(1)
		} else {
			color.New(color.FgGreen).Printf("The porter.yaml file is valid!\n")
		}
	},
}

var porterYAML string

func init() {
	rootCmd.AddCommand(applyCmd)

	applyCmd.AddCommand(applyValidateCmd)

	applyCmd.PersistentFlags().StringVarP(&porterYAML, "file", "f", "", "path to porter.yaml")
	applyCmd.MarkFlagRequired("file")
}

func apply(_ *types.GetAuthenticatedUserResponse, client *api.Client, _ []string) error {
	if _, ok := os.LookupEnv("PORTER_VALIDATE_YAML"); ok {
		err := applyValidate()

		if err != nil {
			return err
		}
	}

	fileBytes, err := ioutil.ReadFile(porterYAML)

	if err != nil {
		return fmt.Errorf("error reading porter.yaml: %w", err)
	}

	resGroup, err := parser.ParseRawBytes(fileBytes)

	if err != nil {
		return fmt.Errorf("error parsing porter.yaml: %w", err)
	}

	basePath, err := os.Getwd()

	if err != nil {
		return fmt.Errorf("error getting working directory: %w", err)
	}

	worker := switchboardWorker.NewWorker()
	worker.RegisterDriver("deploy", NewDeployDriver)
	worker.RegisterDriver("build-image", preview.NewBuildDriver)
	worker.RegisterDriver("push-image", preview.NewPushDriver)
	worker.RegisterDriver("update-config", preview.NewUpdateConfigDriver)
	worker.RegisterDriver("random-string", preview.NewRandomStringDriver)
	worker.RegisterDriver("env-group", preview.NewEnvGroupDriver)
	worker.RegisterDriver("os-env", preview.NewOSEnvDriver)

	worker.SetDefaultDriver("deploy")

	deploymentHookConfig := DeploymentHookConfig{
		PorterAPIClient: client,
		ResourceGroup:   *resGroup,
	}
	deploymentHook, err := NewDeploymentHook(deploymentHookConfig)
	if err != nil {
		return fmt.Errorf("error creating deployment hook: %w", err)
	}
	fmt.Printf("stefan %#v\n\n%#v\n%v\n", deploymentHook, deploymentHookConfig, deploymentHook.isBranchDeploy())

	worker.RegisterHook("deployment", &deploymentHook)

	cloneEnvGroupHook := NewCloneEnvGroupHook(client, resGroup)
	worker.RegisterHook("cloneenvgroup", cloneEnvGroupHook)

	return worker.Apply(resGroup, &switchboardTypes.ApplyOpts{
		BasePath: basePath,
	})
}

func applyValidate() error {
	fileBytes, err := ioutil.ReadFile(porterYAML)

	if err != nil {
		return fmt.Errorf("error reading porter.yaml: %w", err)
	}

	validationErrors := previewInt.Validate(string(fileBytes))

	if len(validationErrors) > 0 {
		errString := "the following error(s) were found while validating the porter.yaml file:"

		for _, err := range validationErrors {
			errString += "\n- " + strings.ReplaceAll(err.Error(), "\n\n*", "\n  *")
		}

		return fmt.Errorf(errString)
	}

	return nil
}

// parseDeploymentHookEnvVars will check if an apply has the appropriate deployment hook environment variables
// and add them to the provided config if present.
// Any supplied values in the DeploymentHookConfig will take precedence over the environment variables
func parseDeploymentHookEnvVars(conf *DeploymentHookConfig) error {
	errResp := func(err error, key string) error {
		return fmt.Errorf("unable to parse required environment variable: %s - %w", key, err)
	}

	if conf.ProjectID == 0 {
		pIDStr := os.Getenv("PORTER_PROJECT")
		pID, err := strconv.Atoi(pIDStr)
		if err != nil {
			return errResp(err, "PORTER_PROJECT")
		}
		conf.ProjectID = pID
	}

	if conf.ClusterID == 0 {
		cIDStr := os.Getenv("PORTER_CLUSTER")
		cID, err := strconv.Atoi(cIDStr)
		if err != nil {
			return errResp(err, "PORTER_CLUSTER")
		}
		conf.ClusterID = cID
	}

	if conf.BranchFrom == "" {
		conf.BranchFrom = os.Getenv("PORTER_BRANCH_FROM")
		if conf.BranchFrom == "" {
			return errResp(errors.New("required parameter missing"), "PORTER_BRANCH_FROM")
		}
	}

	if conf.BranchInto == "" {
		conf.BranchInto = os.Getenv("PORTER_BRANCH_INTO")
	}

	if conf.GithubAppID == 0 {
		ghIDStr := os.Getenv("PORTER_GIT_INSTALLATION_ID")
		ghID, err := strconv.Atoi(ghIDStr)
		if err != nil {
			return errResp(err, "PORTER_GIT_INSTALLATION_ID")
		}
		conf.GithubAppID = ghID
	}

	if conf.GithubActionID == 0 {
		actionIDStr := os.Getenv("PORTER_ACTION_ID")
		actionID, err := strconv.Atoi(actionIDStr)
		if err != nil {
			return errResp(err, "PORTER_ACTION_ID")
		}
		conf.GithubActionID = actionID
	}

	if conf.RepoName == "" {
		conf.RepoName = os.Getenv("PORTER_REPO_NAME")
		if conf.RepoName == "" {
			return errResp(errors.New("required parameter missing"), "PORTER_REPO_NAME")
		}
	}

	if conf.RepoOwner == "" {
		conf.RepoOwner = os.Getenv("PORTER_REPO_OWNER")
		if conf.RepoOwner == "" {
			return errResp(errors.New("required parameter missing"), "PORTER_REPO_OWNER")
		}
	}

	if conf.PullRequestName == "" {
		conf.PullRequestName = os.Getenv("PORTER_PR_NAME")
	}

	if conf.PullRequestID == 0 {
		prIDStr := os.Getenv("PORTER_PULL_REQUEST_ID")
		prID, err := strconv.Atoi(prIDStr)
		if err != nil {
			return errResp(err, "PORTER_PULL_REQUEST_ID")
		}
		conf.PullRequestID = prID
	}

	if conf.Namespace == "" {
		conf.Namespace = os.Getenv("PORTER_NAMESPACE")
		if conf.Namespace == "" {
			conf.Namespace = preview.DefaultPreviewEnvironmentNamespace(conf.BranchFrom, conf.RepoOwner, conf.RepoName)
		}
		// setting namespace env var is required here as we rely on it globally. This can be removed when preview.getNamespace() is no longer used.
		os.Setenv("PORTER_NAMESPACE", conf.Namespace)
	}

	return nil
}

type DeployDriver struct {
	source      *previewInt.Source
	target      *previewInt.Target
	output      map[string]interface{}
	lookupTable *map[string]drivers.Driver
	logger      *zerolog.Logger
}

func NewDeployDriver(resource *switchboardModels.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &DeployDriver{
		lookupTable: opts.DriverLookupTable,
		logger:      opts.Logger,
		output:      make(map[string]interface{}),
	}

	target, err := preview.GetTarget(resource.Name, resource.Target)

	if err != nil {
		return nil, err
	}

	driver.target = target

	source, err := preview.GetSource(target.Project, resource.Name, resource.Source)

	if err != nil {
		return nil, err
	}

	driver.source = source

	return driver, nil
}

func (d *DeployDriver) ShouldApply(_ *switchboardModels.Resource) bool {
	return true
}

func (d *DeployDriver) Apply(resource *switchboardModels.Resource) (*switchboardModels.Resource, error) {
	client := config.GetAPIClient()

	_, err := client.GetRelease(
		context.Background(),
		d.target.Project,
		d.target.Cluster,
		d.target.Namespace,
		resource.Name,
	)

	shouldCreate := err != nil

	if err != nil {
		color.New(color.FgYellow).Printf("Could not read release %s/%s (%s): attempting creation\n", d.target.Namespace, resource.Name, err.Error())
	}

	if d.source.IsApplication {
		return d.applyApplication(resource, client, shouldCreate)
	}

	return d.applyAddon(resource, client, shouldCreate)
}

// Simple apply for addons
func (d *DeployDriver) applyAddon(resource *switchboardModels.Resource, client *api.Client, shouldCreate bool) (*switchboardModels.Resource, error) {
	addonConfig, err := d.getAddonConfig(resource)

	if err != nil {
		return nil, fmt.Errorf("error getting addon config for resource %s: %w", resource.Name, err)
	}

	if shouldCreate {
		err := client.DeployAddon(
			context.Background(),
			d.target.Project,
			d.target.Cluster,
			d.target.Namespace,
			&types.CreateAddonRequest{
				CreateReleaseBaseRequest: &types.CreateReleaseBaseRequest{
					RepoURL:         d.source.Repo,
					TemplateName:    d.source.Name,
					TemplateVersion: d.source.Version,
					Values:          addonConfig,
					Name:            resource.Name,
				},
			},
		)

		if err != nil {
			return nil, fmt.Errorf("error creating addon from resource %s: %w", resource.Name, err)
		}
	} else {
		bytes, err := json.Marshal(addonConfig)

		if err != nil {
			return nil, fmt.Errorf("error marshalling addon config from resource %s: %w", resource.Name, err)
		}

		err = client.UpgradeRelease(
			context.Background(),
			d.target.Project,
			d.target.Cluster,
			d.target.Namespace,
			resource.Name,
			&types.UpgradeReleaseRequest{
				Values: string(bytes),
			},
		)

		if err != nil {
			return nil, fmt.Errorf("error updating addon from resource %s: %w", resource.Name, err)
		}
	}

	if err = d.assignOutput(resource, client); err != nil {
		return nil, err
	}

	return resource, nil
}

func (d *DeployDriver) applyApplication(resource *switchboardModels.Resource, client *api.Client, shouldCreate bool) (*switchboardModels.Resource, error) {
	if resource == nil {
		return nil, fmt.Errorf("nil resource")
	}

	resourceName := resource.Name

	appConfig, err := d.getApplicationConfig(resource)

	if err != nil {
		return nil, err
	}

	fullPath, err := filepath.Abs(appConfig.Build.Context)

	if err != nil {
		return nil, fmt.Errorf("for resource %s, error getting absolute path for config.build.context: %w", resourceName,
			err)
	}

	tag := os.Getenv("PORTER_TAG")

	if tag == "" {
		color.New(color.FgYellow).Printf("for resource %s, since PORTER_TAG is not set, the Docker image tag will default to"+
			" the git repo SHA\n", resourceName)

		commit, err := git.LastCommit()

		if err != nil {
			return nil, fmt.Errorf("for resource %s, error getting last git commit: %w", resourceName, err)
		}

		tag = commit.Sha[:7]

		color.New(color.FgYellow).Printf("for resource %s, using tag %s\n", resourceName, tag)
	}

	// if the method is registry and a tag is defined, we use the provided tag
	if appConfig.Build.Method == "registry" {
		imageSpl := strings.Split(appConfig.Build.Image, ":")

		if len(imageSpl) == 2 {
			tag = imageSpl[1]
		}

		if tag == "" {
			tag = "latest"
		}
	}

	sharedOpts := &deploy.SharedOpts{
		ProjectID:       d.target.Project,
		ClusterID:       d.target.Cluster,
		Namespace:       d.target.Namespace,
		LocalPath:       fullPath,
		LocalDockerfile: appConfig.Build.Dockerfile,
		OverrideTag:     tag,
		Method:          deploy.DeployBuildType(appConfig.Build.Method),
		EnvGroups:       appConfig.EnvGroups,
		UseCache:        appConfig.Build.UseCache,
	}

	if appConfig.Build.UseCache {
		// set the docker config so that pack caching can use the repo credentials
		err := config.SetDockerConfig(client)

		if err != nil {
			return nil, err
		}
	}

	if shouldCreate {
		resource, err = d.createApplication(resource, client, sharedOpts, appConfig)

		if err != nil {
			return nil, fmt.Errorf("error creating app from resource %s: %w", resourceName, err)
		}
	} else if !appConfig.OnlyCreate {
		resource, err = d.updateApplication(resource, client, sharedOpts, appConfig)

		if err != nil {
			return nil, fmt.Errorf("error updating application from resource %s: %w", resourceName, err)
		}
	} else {
		color.New(color.FgYellow).Printf("Skipping creation for resource %s as onlyCreate is set to true\n", resourceName)
	}

	if err = d.assignOutput(resource, client); err != nil {
		return nil, err
	}

	if d.source.Name == "job" && appConfig.WaitForJob && (shouldCreate || !appConfig.OnlyCreate) {
		color.New(color.FgYellow).Printf("Waiting for job '%s' to finish\n", resourceName)

		err = wait.WaitForJob(client, &wait.WaitOpts{
			ProjectID: d.target.Project,
			ClusterID: d.target.Cluster,
			Namespace: d.target.Namespace,
			Name:      resourceName,
		})

		if err != nil && appConfig.OnlyCreate {
			deleteJobErr := client.DeleteRelease(
				context.Background(),
				d.target.Project,
				d.target.Cluster,
				d.target.Namespace,
				resourceName,
			)

			if deleteJobErr != nil {
				return nil, fmt.Errorf("error deleting job %s with waitForJob and onlyCreate set to true: %w",
					resourceName, deleteJobErr)
			}
		} else if err != nil {
			return nil, fmt.Errorf("error waiting for job %s: %w", resourceName, err)
		}
	}

	return resource, err
}

func (d *DeployDriver) createApplication(resource *switchboardModels.Resource, client *api.Client, sharedOpts *deploy.SharedOpts, appConf *previewInt.ApplicationConfig) (*switchboardModels.Resource, error) {
	// create new release
	color.New(color.FgGreen).Printf("Creating %s release: %s\n", d.source.Name, resource.Name)

	regList, err := client.ListRegistries(context.Background(), d.target.Project)

	if err != nil {
		return nil, fmt.Errorf("for resource %s, error listing registries: %w", resource.Name, err)
	}

	var registryURL string

	if len(*regList) == 0 {
		return nil, fmt.Errorf("no registry found")
	} else {
		registryURL = (*regList)[0].URL
	}

	color.New(color.FgBlue).Printf("for resource %s, using registry %s\n", resource.Name, registryURL)

	// attempt to get repo suffix from environment variables
	var repoSuffix string

	if repoName := os.Getenv("PORTER_REPO_NAME"); repoName != "" {
		if repoOwner := os.Getenv("PORTER_REPO_OWNER"); repoOwner != "" {
			repoSuffix = strings.ToLower(strings.ReplaceAll(fmt.Sprintf("%s-%s", repoOwner, repoName), "_", "-"))
		}
	}

	createAgent := &deploy.CreateAgent{
		Client: client,
		CreateOpts: &deploy.CreateOpts{
			SharedOpts:  sharedOpts,
			Kind:        d.source.Name,
			ReleaseName: resource.Name,
			RegistryURL: registryURL,
			RepoSuffix:  repoSuffix,
		},
	}

	var buildConfig *types.BuildConfig

	if appConf.Build.Builder != "" {
		buildConfig = &types.BuildConfig{
			Builder:    appConf.Build.Builder,
			Buildpacks: appConf.Build.Buildpacks,
		}
	}

	var subdomain string

	if appConf.Build.Method == "registry" {
		subdomain, err = createAgent.CreateFromRegistry(appConf.Build.Image, appConf.Values)
	} else {
		// if useCache is set, create the image repository first
		if appConf.Build.UseCache {
			regID, imageURL, err := createAgent.GetImageRepoURL(resource.Name, sharedOpts.Namespace)

			if err != nil {
				return nil, err
			}

			err = client.CreateRepository(
				context.Background(),
				sharedOpts.ProjectID,
				regID,
				&types.CreateRegistryRepositoryRequest{
					ImageRepoURI: imageURL,
				},
			)

			if err != nil {
				return nil, err
			}
		}

		subdomain, err = createAgent.CreateFromDocker(appConf.Values, sharedOpts.OverrideTag, buildConfig)
	}

	if err != nil {
		return nil, err
	}

	return resource, handleSubdomainCreate(subdomain, err)
}

func (d *DeployDriver) updateApplication(resource *switchboardModels.Resource, client *api.Client, sharedOpts *deploy.SharedOpts, appConf *previewInt.ApplicationConfig) (*switchboardModels.Resource, error) {
	color.New(color.FgGreen).Println("Updating existing release:", resource.Name)

	if len(appConf.Build.Env) > 0 {
		sharedOpts.AdditionalEnv = appConf.Build.Env
	}

	updateAgent, err := deploy.NewDeployAgent(client, resource.Name, &deploy.DeployOpts{
		SharedOpts: sharedOpts,
		Local:      appConf.Build.Method != "registry",
	})

	if err != nil {
		return nil, err
	}

	// if the build method is registry, we do not trigger a build
	if appConf.Build.Method != "registry" {
		buildEnv, err := updateAgent.GetBuildEnv(&deploy.GetBuildEnvOpts{
			UseNewConfig: true,
			NewConfig:    appConf.Values,
		})

		if err != nil {
			return nil, err
		}

		err = updateAgent.SetBuildEnv(buildEnv)

		if err != nil {
			return nil, err
		}

		var buildConfig *types.BuildConfig

		if appConf.Build.Builder != "" {
			buildConfig = &types.BuildConfig{
				Builder:    appConf.Build.Builder,
				Buildpacks: appConf.Build.Buildpacks,
			}
		}

		err = updateAgent.Build(buildConfig)

		if err != nil {
			return nil, err
		}

		if !appConf.Build.UseCache {
			err = updateAgent.Push()

			if err != nil {
				return nil, err
			}
		}
	}

	err = updateAgent.UpdateImageAndValues(appConf.Values)

	if err != nil {
		return nil, err
	}

	return resource, nil
}

func (d *DeployDriver) assignOutput(resource *switchboardModels.Resource, client *api.Client) error {
	release, err := client.GetRelease(
		context.Background(),
		d.target.Project,
		d.target.Cluster,
		d.target.Namespace,
		resource.Name,
	)

	if err != nil {
		return err
	}

	d.output = utils.CoalesceValues(d.source.SourceValues, release.Config)

	return nil
}

func (d *DeployDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func (d *DeployDriver) getApplicationConfig(resource *switchboardModels.Resource) (*previewInt.ApplicationConfig, error) {
	populatedConf, err := drivers.ConstructConfig(&drivers.ConstructConfigOpts{
		RawConf:      resource.Config,
		LookupTable:  *d.lookupTable,
		Dependencies: resource.Dependencies,
	})

	if err != nil {
		return nil, err
	}

	appConf := &previewInt.ApplicationConfig{}

	err = mapstructure.Decode(populatedConf, appConf)

	if err != nil {
		return nil, err
	}

	if _, ok := resource.Config["waitForJob"]; !ok && d.source.Name == "job" {
		// default to true and wait for the job to finish
		appConf.WaitForJob = true
	}

	return appConf, nil
}

func (d *DeployDriver) getAddonConfig(resource *switchboardModels.Resource) (map[string]interface{}, error) {
	return drivers.ConstructConfig(&drivers.ConstructConfigOpts{
		RawConf:      resource.Config,
		LookupTable:  *d.lookupTable,
		Dependencies: resource.Dependencies,
	})
}

// DeploymentHook is used for deploying an application into a given cluster
type DeploymentHook struct {
	client                                                                    *api.Client
	resourceGroup                                                             *switchboardTypes.ResourceGroup
	gitInstallationID, projectID, clusterID, prID, actionID, envID            uint
	branchFrom, branchInto, namespace, repoName, repoOwner, prName, commitSHA string
}

// DeploymentHookConfig contains all config and overrides for initialising a deployment DeploymentHook
// which is used for deploying a given `porter apply`
type DeploymentHookConfig struct {
	// ProjectID is the Porter Project ID for the cluster
	ProjectID int
	// ClusterID is the Porter Cluster ID for deploying into
	ClusterID int
	// PorterAPIClient is the settings used for communicating with the Porter API
	PorterAPIClient *api.Client
	// ResourceGroup ...
	ResourceGroup switchboardTypes.ResourceGroup
	// Namespace is the name of the namespace into which an application will be deployed.
	// If this is not provided, a default namespace will be used.
	// In the case of preview environments, this will be previewbranch-XXX, where XXX is your PR name
	Namespace string

	// BranchFrom is the branch from which the preview environment will be created
	BranchFrom string
	// BranchInto is the branch in with a PR will be created. If using branch based preview environments,
	// set this value to the same as BranchFrom
	BranchInto string

	// GithubID is the ID of the Github App used for deployment
	GithubAppID int
	// GithubActionID is the ID of the Github Action used to deploy an application
	GithubActionID int
	// PullRequestName is the name of a PR which will be used in the Preview Environment workflows
	PullRequestName string
	// PullRequestID is the ID of a PR which will be used in the Preview Environment workflows
	PullRequestID int
	// RepoName is the name of the given repository for deploying. In Github, with will be of the format <RepoOwner/RepoName> .i.e porter-dev/porter
	RepoName string
	// RepoOwner is the owner of the given repository for deploying. In Github, with will be of the format <RepoOwner/RepoName> .i.e porter-dev/porter
	RepoOwner string
}

// NewDeploymentHook is used for creating a new DeploymentHook, checking that the required variable combinations are present
func NewDeploymentHook(conf DeploymentHookConfig) (DeploymentHook, error) {
	err := parseDeploymentHookEnvVars(&conf)
	if err != nil {
		return DeploymentHook{}, err
	}

	res := DeploymentHook{
		client:        conf.PorterAPIClient,
		resourceGroup: &conf.ResourceGroup,
		namespace:     conf.Namespace,

		projectID: uint(conf.ProjectID),
		clusterID: uint(conf.ClusterID),

		branchFrom: conf.BranchFrom,
		branchInto: conf.BranchInto,

		gitInstallationID: uint(conf.GithubAppID),
		actionID:          uint(conf.GithubActionID),
		repoName:          conf.RepoName,
		repoOwner:         conf.RepoOwner,
		prName:            conf.PullRequestName,
		prID:              uint(conf.PullRequestID),
	}

	commit, err := git.LastCommit()
	if err != nil {
		return res, fmt.Errorf(err.Error())
	}
	res.commitSHA = commit.Sha[:7]

	if !res.isBranchDeploy() {
		if conf.PullRequestID == 0 || conf.PullRequestName == "" {
			if err != nil {
				return res, errors.New("PR based deploys require a PullRequestID and PullRequestName")
			}
		}
	}

	return res, nil
}

func (t *DeploymentHook) isBranchDeploy() bool {
	return t.branchFrom != "" && t.branchInto != "" && t.branchFrom == t.branchInto
}

func (t *DeploymentHook) PreApply() error {
	if isSystemNamespace(t.namespace) {
		color.New(color.FgYellow).Printf("attempting to deploy to system namespace '%s'\n", t.namespace)
	}

	envList, err := t.client.ListEnvironments(
		context.Background(), t.projectID, t.clusterID,
	)
	if err != nil {
		return fmt.Errorf("error listing environments: %w", err)
	}

	envs := *envList
	var deplEnv *types.Environment

	for _, env := range envs {
		if strings.EqualFold(env.GitRepoOwner, t.repoOwner) &&
			strings.EqualFold(env.GitRepoName, t.repoName) &&
			env.GitInstallationID == t.gitInstallationID {
			t.envID = env.ID
			deplEnv = env
			break
		}
	}

	if t.envID == 0 {
		return fmt.Errorf("could not find environment for deployment")
	}

	nsList, err := t.client.GetK8sNamespaces(
		context.Background(), t.projectID, t.clusterID,
	)
	if err != nil {
		return fmt.Errorf("error fetching namespaces: %w", err)
	}

	found := false

	for _, ns := range *nsList {
		if ns.Name == t.namespace {
			found = true
			break
		}
	}

	if !found {
		if isSystemNamespace(t.namespace) {
			return fmt.Errorf("attempting to deploy to system namespace '%s' which does not exist, please create it "+
				"to continue", t.namespace)
		}

		createNS := &types.CreateNamespaceRequest{
			Name: t.namespace,
		}

		if len(deplEnv.NamespaceLabels) > 0 {
			createNS.Labels = deplEnv.NamespaceLabels
		}

		// create the new namespace
		_, err := t.client.CreateNewK8sNamespace(context.Background(), t.projectID, t.clusterID, createNS)

		if err != nil && !strings.Contains(err.Error(), "namespace already exists") {
			// ignore the error if the namespace already exists
			//
			// this might happen if someone creates the namespace in between this operation
			return fmt.Errorf("error creating namespace: %w", err)
		}
	}

	var deplErr error

	if t.isBranchDeploy() {
		_, deplErr = t.client.GetDeployment(
			context.Background(),
			t.projectID, t.clusterID, t.envID,
			&types.GetDeploymentRequest{
				Namespace: t.namespace,
			},
		)
	} else {
		_, deplErr = t.client.GetDeployment(
			context.Background(),
			t.projectID, t.clusterID, t.envID,
			&types.GetDeploymentRequest{
				PRNumber: t.prID,
			},
		)
	}

	if deplErr != nil && strings.Contains(deplErr.Error(), "not found") {
		// in this case, create the deployment
		createReq := &types.CreateDeploymentRequest{
			Namespace:     t.namespace,
			PullRequestID: t.prID,
			CreateGHDeploymentRequest: &types.CreateGHDeploymentRequest{
				ActionID: t.actionID,
			},
			GitHubMetadata: &types.GitHubMetadata{
				PRName:       t.prName,
				RepoName:     t.repoName,
				RepoOwner:    t.repoOwner,
				CommitSHA:    t.commitSHA,
				PRBranchFrom: t.branchFrom,
				PRBranchInto: t.branchInto,
			},
		}

		if t.isBranchDeploy() {
			createReq.PullRequestID = 0
		}

		_, err = t.client.CreateDeployment(
			context.Background(),
			t.projectID, t.gitInstallationID, t.clusterID,
			t.repoOwner, t.repoName, createReq,
		)
		return fmt.Errorf("error creating deployment: %w", err)
	}

	updateReq := &types.UpdateDeploymentRequest{
		Namespace: t.namespace,
		PRNumber:  t.prID,
		CreateGHDeploymentRequest: &types.CreateGHDeploymentRequest{
			ActionID: t.actionID,
		},
		PRBranchFrom: t.branchFrom,
		CommitSHA:    t.commitSHA,
	}

	if t.isBranchDeploy() {
		updateReq.PRNumber = 0
	}

	_, err = t.client.UpdateDeployment(
		context.Background(),
		t.projectID, t.gitInstallationID, t.clusterID,
		t.repoOwner, t.repoName, updateReq,
	)
	if err != nil {
		return fmt.Errorf("error updating deployment: %w", err)
	}

	return nil
}

func (t *DeploymentHook) DataQueries() map[string]interface{} {
	res := make(map[string]interface{})

	// use the resource group to find all web applications that can have an exposed subdomain
	// that we can query for
	for _, resource := range t.resourceGroup.Resources {
		isWeb := false

		if sourceNameInter, exists := resource.Source["name"]; exists {
			if sourceName, ok := sourceNameInter.(string); ok {
				if sourceName == "web" {
					isWeb = true
				}
			}
		}

		if isWeb {
			// determine if we should query for porter_hosts or just hosts
			isCustomDomain := false

			ingressMap, err := deploy.GetNestedMap(resource.Config, "values", "ingress")

			if err == nil {
				enabledVal, enabledExists := ingressMap["enabled"]

				customDomVal, customDomExists := ingressMap["custom_domain"]

				if enabledExists && customDomExists {
					enabled, eOK := enabledVal.(bool)
					customDomain, cOK := customDomVal.(bool)

					if eOK && cOK && enabled {
						if customDomain {
							// return the first custom domain when one exists
							hostsArr, hostsExists := ingressMap["hosts"]

							if hostsExists {
								hostsArrVal, hostsArrOk := hostsArr.([]interface{})

								if hostsArrOk && len(hostsArrVal) > 0 {
									if _, ok := hostsArrVal[0].(string); ok {
										res[resource.Name] = fmt.Sprintf("{ .%s.ingress.hosts[0] }", resource.Name)
										isCustomDomain = true
									}
								}
							}
						}
					}
				}
			}

			if !isCustomDomain {
				res[resource.Name] = fmt.Sprintf("{ .%s.ingress.porter_hosts[0] }", resource.Name)
			}
		}
	}

	return res
}

func (t *DeploymentHook) PostApply(populatedData map[string]interface{}) error {
	subdomains := make([]string, 0)

	for _, data := range populatedData {
		domain, ok := data.(string)

		if !ok {
			continue
		}

		if _, err := url.Parse("https://" + domain); err == nil {
			subdomains = append(subdomains, "https://"+domain)
		}
	}

	req := &types.FinalizeDeploymentRequest{
		Subdomain: strings.Join(subdomains, ", "),
	}

	if t.isBranchDeploy() {
		req.Namespace = t.namespace
	} else {
		req.PRNumber = t.prID
	}

	for _, res := range t.resourceGroup.Resources {
		releaseType := getReleaseType(t.projectID, res)
		releaseName := getReleaseName(res)

		if releaseType != "" && releaseName != "" {
			req.SuccessfulResources = append(req.SuccessfulResources, &types.SuccessfullyDeployedResource{
				ReleaseName: releaseName,
				ReleaseType: releaseType,
			})
		}
	}

	// finalize the deployment
	_, err := t.client.FinalizeDeployment(
		context.Background(),
		t.projectID, t.gitInstallationID, t.clusterID,
		t.repoOwner, t.repoName, req,
	)

	return err
}

func (t *DeploymentHook) OnError(error) {
	var deplErr error

	if t.isBranchDeploy() {
		_, deplErr = t.client.GetDeployment(
			context.Background(),
			t.projectID, t.clusterID, t.envID,
			&types.GetDeploymentRequest{
				Namespace: t.namespace,
			},
		)
	} else {
		_, deplErr = t.client.GetDeployment(
			context.Background(),
			t.projectID, t.clusterID, t.envID,
			&types.GetDeploymentRequest{
				PRNumber: t.prID,
			},
		)
	}

	// if the deployment exists, throw an error for that deployment
	if deplErr == nil {
		req := &types.UpdateDeploymentStatusRequest{
			CreateGHDeploymentRequest: &types.CreateGHDeploymentRequest{
				ActionID: t.actionID,
			},
			PRBranchFrom: t.branchFrom,
			Status:       string(types.DeploymentStatusFailed),
		}

		if t.isBranchDeploy() {
			req.Namespace = t.namespace
		} else {
			req.PRNumber = t.prID
		}

		// FIXME: try to use the error with a custom logger
		t.client.UpdateDeploymentStatus(
			context.Background(),
			t.projectID, t.gitInstallationID, t.clusterID,
			t.repoOwner, t.repoName, req,
		)
	}
}

func (t *DeploymentHook) OnConsolidatedErrors(allErrors map[string]error) {
	var deplErr error

	if t.isBranchDeploy() {
		_, deplErr = t.client.GetDeployment(
			context.Background(),
			t.projectID, t.clusterID, t.envID,
			&types.GetDeploymentRequest{
				Namespace: t.namespace,
			},
		)
	} else {
		_, deplErr = t.client.GetDeployment(
			context.Background(),
			t.projectID, t.clusterID, t.envID,
			&types.GetDeploymentRequest{
				PRNumber: t.prID,
			},
		)
	}

	// if the deployment exists, throw an error for that deployment
	if deplErr == nil {
		req := &types.FinalizeDeploymentWithErrorsRequest{
			Errors: make(map[string]string),
		}

		if t.isBranchDeploy() {
			req.Namespace = t.namespace
		} else {
			req.PRNumber = t.prID
		}

		for _, res := range t.resourceGroup.Resources {
			if _, ok := allErrors[res.Name]; !ok {
				req.SuccessfulResources = append(req.SuccessfulResources, &types.SuccessfullyDeployedResource{
					ReleaseName: getReleaseName(res),
					ReleaseType: getReleaseType(t.projectID, res),
				})
			}
		}

		for res, err := range allErrors {
			req.Errors[res] = err.Error()
		}

		// FIXME: handle the error
		t.client.FinalizeDeploymentWithErrors(
			context.Background(),
			t.projectID, t.gitInstallationID, t.clusterID,
			t.repoOwner, t.repoName,
			req,
		)
	}
}

type CloneEnvGroupHook struct {
	client   *api.Client
	resGroup *switchboardTypes.ResourceGroup
}

func NewCloneEnvGroupHook(client *api.Client, resourceGroup *switchboardTypes.ResourceGroup) *CloneEnvGroupHook {
	return &CloneEnvGroupHook{
		client:   client,
		resGroup: resourceGroup,
	}
}

func (t *CloneEnvGroupHook) PreApply() error {
	for _, res := range t.resGroup.Resources {
		if res.Driver == "env-group" {
			continue
		}

		appConf := &previewInt.ApplicationConfig{}

		err := mapstructure.Decode(res.Config, &appConf)
		if err != nil {
			continue
		}

		if appConf != nil && len(appConf.EnvGroups) > 0 {
			target, err := preview.GetTarget(res.Name, res.Target)

			if err != nil {
				return err
			}

			for _, group := range appConf.EnvGroups {
				if group.Name == "" {
					return fmt.Errorf("env group name cannot be empty")
				}

				_, err := t.client.GetEnvGroup(
					context.Background(),
					target.Project,
					target.Cluster,
					target.Namespace,
					&types.GetEnvGroupRequest{
						Name:    group.Name,
						Version: group.Version,
					},
				)

				if err != nil && err.Error() == "env group not found" {
					if group.Namespace == "" {
						return fmt.Errorf("env group namespace cannot be empty")
					}

					color.New(color.FgBlue, color.Bold).
						Printf("Env group '%s' does not exist in the target namespace '%s'\n", group.Name, target.Namespace)
					color.New(color.FgBlue, color.Bold).
						Printf("Cloning env group '%s' from namespace '%s' to target namespace '%s'\n",
							group.Name, group.Namespace, target.Namespace)

					_, err = t.client.CloneEnvGroup(
						context.Background(), target.Project, target.Cluster, group.Namespace,
						&types.CloneEnvGroupRequest{
							Name:      group.Name,
							Namespace: target.Namespace,
						},
					)

					if err != nil {
						return err
					}
				} else if err != nil {
					return err
				}
			}
		}
	}

	return nil
}

func (t *CloneEnvGroupHook) DataQueries() map[string]interface{} {
	return nil
}

func (t *CloneEnvGroupHook) PostApply(map[string]interface{}) error {
	return nil
}

func (t *CloneEnvGroupHook) OnError(error) {}

func (t *CloneEnvGroupHook) OnConsolidatedErrors(map[string]error) {}

func getReleaseName(res *switchboardTypes.Resource) string {
	// can ignore the error because this method is called once
	// GetTarget has alrealy been called and validated previously
	target, _ := preview.GetTarget(res.Name, res.Target)

	if target.AppName != "" {
		return target.AppName
	}

	return res.Name
}

func getReleaseType(projectID uint, res *switchboardTypes.Resource) string {
	// can ignore the error because this method is called once
	// GetSource has alrealy been called and validated previously
	source, _ := preview.GetSource(projectID, res.Name, res.Source)

	if source != nil && source.Name != "" {
		return source.Name
	}

	return ""
}

func isSystemNamespace(namespace string) bool {
	return namespace == "cert-manager" || namespace == "ingress-nginx" ||
		namespace == "kube-node-lease" || namespace == "kube-public" ||
		namespace == "kube-system" || namespace == "monitoring" ||
		namespace == "porter-agent-system" || namespace == "default" ||
		namespace == "ingress-nginx-private"
}
