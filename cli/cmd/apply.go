package cmd

import (
	"context"
	"encoding/json"
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
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/internal/templater/utils"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
	"github.com/porter-dev/switchboard/pkg/parser"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
	"github.com/porter-dev/switchboard/pkg/worker"
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
			os.Exit(1)
		}
	},
}

var porterYAML string

func init() {
	rootCmd.AddCommand(applyCmd)

	applyCmd.Flags().StringVarP(&porterYAML, "file", "f", "", "path to porter.yaml")
	applyCmd.MarkFlagRequired("file")
}

func apply(_ *types.GetAuthenticatedUserResponse, client *api.Client, args []string) error {
	fileBytes, err := ioutil.ReadFile(porterYAML)
	if err != nil {
		return err
	}

	resGroup, err := parser.ParseRawBytes(fileBytes)
	if err != nil {
		return err
	}

	basePath, err := os.Getwd()

	if err != nil {
		return err
	}

	worker := worker.NewWorker()
	worker.RegisterDriver("porter.deploy", NewPorterDriver)
	worker.SetDefaultDriver("porter.deploy")

	if hasDeploymentHookEnvVars() {
		deplNamespace := os.Getenv("PORTER_NAMESPACE")

		if deplNamespace == "" {
			return fmt.Errorf("namespace must be set by PORTER_NAMESPACE")
		}

		deploymentHook, err := NewDeploymentHook(client, resGroup, deplNamespace)

		if err != nil {
			return err
		}

		worker.RegisterHook("deployment", deploymentHook)
	}

	cloneEnvGroupHook := NewCloneEnvGroupHook(client, resGroup)
	worker.RegisterHook("cloneenvgroup", cloneEnvGroupHook)

	return worker.Apply(resGroup, &switchboardTypes.ApplyOpts{
		BasePath: basePath,
	})
}

func hasDeploymentHookEnvVars() bool {
	if ghIDStr := os.Getenv("PORTER_GIT_INSTALLATION_ID"); ghIDStr == "" {
		return false
	}

	if prIDStr := os.Getenv("PORTER_PULL_REQUEST_ID"); prIDStr == "" {
		return false
	}

	if branchName := os.Getenv("PORTER_BRANCH_NAME"); branchName == "" {
		return false
	}

	if actionIDStr := os.Getenv("PORTER_ACTION_ID"); actionIDStr == "" {
		return false
	}

	if repoName := os.Getenv("PORTER_REPO_NAME"); repoName == "" {
		return false
	}

	if repoOwner := os.Getenv("PORTER_REPO_OWNER"); repoOwner == "" {
		return false
	}

	if prName := os.Getenv("PORTER_PR_NAME"); prName == "" {
		return false
	}

	return true
}

type Source struct {
	Name          string
	Repo          string
	Version       string
	IsApplication bool
	SourceValues  map[string]interface{}
}

type Target struct {
	Project   uint
	Cluster   uint
	Namespace string
}

type ApplicationConfig struct {
	WaitForJob bool

	Build struct {
		ForceBuild bool
		ForcePush  bool
		Method     string
		Context    string
		Dockerfile string
		Image      string
		Builder    string
		Buildpacks []string
	}

	EnvGroups []types.EnvGroupMeta

	Values map[string]interface{}
}

type Driver struct {
	source      *Source
	target      *Target
	output      map[string]interface{}
	lookupTable *map[string]drivers.Driver
	logger      *zerolog.Logger
}

func NewPorterDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &Driver{
		lookupTable: opts.DriverLookupTable,
		logger:      opts.Logger,
		output:      make(map[string]interface{}),
	}

	source := &Source{}

	err := getSource(resource.Source, source)
	if err != nil {
		return nil, err
	}

	driver.source = source

	target := &Target{}

	err = getTarget(resource.Target, target)
	if err != nil {
		return nil, err
	}

	driver.target = target

	return driver, nil
}

func (d *Driver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *Driver) Apply(resource *models.Resource) (*models.Resource, error) {
	client := GetAPIClient(config)
	name := resource.Name

	if name == "" {
		return nil, fmt.Errorf("empty app name")
	}

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
func (d *Driver) applyAddon(resource *models.Resource, client *api.Client, shouldCreate bool) (*models.Resource, error) {
	var err error
	if shouldCreate {
		err = client.DeployAddon(
			context.Background(),
			d.target.Project,
			d.target.Cluster,
			d.target.Namespace,
			&types.CreateAddonRequest{
				CreateReleaseBaseRequest: &types.CreateReleaseBaseRequest{
					RepoURL:         d.source.Repo,
					TemplateName:    d.source.Name,
					TemplateVersion: d.source.Version,
					Values:          resource.Config,
					Name:            resource.Name,
				},
			},
		)
	} else {
		bytes, err := json.Marshal(resource.Config)

		if err != nil {
			return nil, err
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
	}

	if err != nil {
		return nil, err
	}

	if err = d.assignOutput(resource, client); err != nil {
		return nil, err
	}

	return resource, err
}

func (d *Driver) applyApplication(resource *models.Resource, client *api.Client, shouldCreate bool) (*models.Resource, error) {
	appConfig, err := d.getApplicationConfig(resource)

	if err != nil {
		return nil, err
	}

	method := appConfig.Build.Method

	if method != "pack" && method != "docker" && method != "registry" {
		return nil, fmt.Errorf("method should either be \"docker\", \"pack\" or \"registry\"")
	}

	fullPath, err := filepath.Abs(appConfig.Build.Context)

	if err != nil {
		return nil, err
	}

	tag := os.Getenv("PORTER_TAG")

	if tag == "" {
		commit, err := git.LastCommit()

		if err != nil {
			return nil, err
		}

		tag = commit.Sha[:7]
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
		Method:          deploy.DeployBuildType(method),
		EnvGroups:       appConfig.EnvGroups,
	}

	if shouldCreate {
		resource, err = d.createApplication(resource, client, sharedOpts, appConfig)

		if err != nil {
			return nil, err
		}
	} else {
		resource, err = d.updateApplication(resource, client, sharedOpts, appConfig)

		if err != nil {
			return nil, err
		}
	}

	if err = d.assignOutput(resource, client); err != nil {
		return nil, err
	}

	if d.source.Name == "job" && appConfig.WaitForJob {
		color.New(color.FgYellow).Printf("Waiting for job '%s' to finish\n", resource.Name)

		prevProject := config.Project
		prevCluster := config.Cluster
		name = resource.Name
		namespace = d.target.Namespace
		config.Project = d.target.Project
		config.Cluster = d.target.Cluster

		err = waitForJob(nil, client, []string{})

		if err != nil {
			return nil, err
		}

		config.Project = prevProject
		config.Cluster = prevCluster
	}

	return resource, err
}

func (d *Driver) createApplication(resource *models.Resource, client *api.Client, sharedOpts *deploy.SharedOpts, appConf *ApplicationConfig) (*models.Resource, error) {
	// create new release
	color.New(color.FgGreen).Printf("Creating %s release: %s\n", d.source.Name, resource.Name)

	regList, err := client.ListRegistries(context.Background(), d.target.Project)

	if err != nil {
		return nil, err
	}

	var registryURL string

	if len(*regList) == 0 {
		return nil, fmt.Errorf("no registry found")
	} else {
		registryURL = (*regList)[0].URL
	}

	// attempt to get repo suffix from environment variables
	var repoSuffix string

	if repoName := os.Getenv("PORTER_REPO_NAME"); repoName != "" {
		if repoOwner := os.Getenv("PORTER_REPO_OWNER"); repoOwner != "" {
			repoSuffix = strings.ReplaceAll(fmt.Sprintf("%s-%s", repoOwner, repoName), "_", "-")
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
		subdomain, err = createAgent.CreateFromDocker(appConf.Values, sharedOpts.OverrideTag, buildConfig, appConf.Build.ForceBuild)
	}

	if err != nil {
		return nil, err
	}

	return resource, handleSubdomainCreate(subdomain, err)
}

func (d *Driver) updateApplication(resource *models.Resource, client *api.Client, sharedOpts *deploy.SharedOpts, appConf *ApplicationConfig) (*models.Resource, error) {
	color.New(color.FgGreen).Println("Updating existing release:", resource.Name)

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

		err = updateAgent.Build(buildConfig, appConf.Build.ForceBuild)

		if err != nil {
			return nil, err
		}

		err = updateAgent.Push(appConf.Build.ForcePush)

		if err != nil {
			return nil, err
		}
	}

	err = updateAgent.UpdateImageAndValues(appConf.Values)

	if err != nil {
		return nil, err
	}

	return resource, nil
}

func (d *Driver) assignOutput(resource *models.Resource, client *api.Client) error {
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

func (d *Driver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func getSource(input map[string]interface{}, output *Source) error {
	// first read from env vars
	output.Name = os.Getenv("PORTER_SOURCE_NAME")
	output.Repo = os.Getenv("PORTER_SOURCE_REPO")
	output.Version = os.Getenv("PORTER_SOURCE_VERSION")

	// next, check for values in the YAML file
	if output.Name == "" {
		if name, ok := input["name"]; ok {
			nameVal, ok := name.(string)
			if !ok {
				return fmt.Errorf("invalid name provided")
			}
			output.Name = nameVal
		}
	}

	if output.Name == "" {
		return fmt.Errorf("source name required")
	}

	if output.Repo == "" {
		if repo, ok := input["repo"]; ok {
			repoVal, ok := repo.(string)
			if !ok {
				return fmt.Errorf("invalid repo provided")
			}
			output.Repo = repoVal
		}
	}

	if output.Version == "" {
		if version, ok := input["version"]; ok {
			versionVal, ok := version.(string)
			if !ok {
				return fmt.Errorf("invalid version provided")
			}
			output.Version = versionVal
		}
	}

	// lastly, just put in the defaults
	if output.Version == "" {
		output.Version = "latest"
	}

	output.IsApplication = output.Repo == "https://charts.getporter.dev"

	if output.Repo == "" {
		output.Repo = "https://charts.getporter.dev"

		values, err := existsInRepo(output.Name, output.Version, output.Repo)

		if err == nil {
			// found in "https://charts.getporter.dev"
			output.SourceValues = values
			output.IsApplication = true
			return nil
		}

		output.Repo = "https://chart-addons.getporter.dev"

		values, err = existsInRepo(output.Name, output.Version, output.Repo)

		if err == nil {
			// found in https://chart-addons.getporter.dev
			output.SourceValues = values
			return nil
		}

		return fmt.Errorf("source does not exist in any repo")
	}

	return fmt.Errorf("source '%s' does not exist in repo '%s'", output.Name, output.Repo)
}

func getTarget(input map[string]interface{}, output *Target) error {
	// first read from env vars
	if projectEnv := os.Getenv("PORTER_PROJECT"); projectEnv != "" {
		project, err := strconv.Atoi(projectEnv)
		if err != nil {
			return err
		}
		output.Project = uint(project)
	}

	if clusterEnv := os.Getenv("PORTER_CLUSTER"); clusterEnv != "" {
		cluster, err := strconv.Atoi(clusterEnv)
		if err != nil {
			return err
		}
		output.Cluster = uint(cluster)
	}

	output.Namespace = os.Getenv("PORTER_NAMESPACE")

	// next, check for values in the YAML file
	if output.Project == 0 {
		if project, ok := input["project"]; ok {
			projectVal, ok := project.(uint)
			if !ok {
				return fmt.Errorf("project value must be an integer")
			}
			output.Project = projectVal
		}
	}

	if output.Cluster == 0 {
		if cluster, ok := input["cluster"]; ok {
			clusterVal, ok := cluster.(uint)
			if !ok {
				return fmt.Errorf("cluster value must be an integer")
			}
			output.Cluster = clusterVal
		}
	}

	if output.Namespace == "" {
		if namespace, ok := input["namespace"]; ok {
			namespaceVal, ok := namespace.(string)
			if !ok {
				return fmt.Errorf("invalid namespace provided")
			}
			output.Namespace = namespaceVal
		}
	}

	// lastly, just put in the defaults
	if output.Project == 0 {
		output.Project = config.Project
	}
	if output.Cluster == 0 {
		output.Cluster = config.Cluster
	}
	if output.Namespace == "" {
		output.Namespace = "default"
	}

	return nil
}

func (d *Driver) getApplicationConfig(resource *models.Resource) (*ApplicationConfig, error) {
	populatedConf, err := drivers.ConstructConfig(&drivers.ConstructConfigOpts{
		RawConf:      resource.Config,
		LookupTable:  *d.lookupTable,
		Dependencies: resource.Dependencies,
	})

	if err != nil {
		return nil, err
	}

	config := &ApplicationConfig{}

	err = mapstructure.Decode(populatedConf, config)

	if err != nil {
		return nil, err
	}

	if _, ok := resource.Config["waitForJob"]; !ok && d.source.Name == "job" {
		// default to true and wait for the job to finish
		config.WaitForJob = true
	}

	return config, nil
}

func existsInRepo(name, version, url string) (map[string]interface{}, error) {
	chart, err := GetAPIClient(config).GetTemplate(
		context.Background(),
		name, version,
		&types.GetTemplateRequest{
			TemplateGetBaseRequest: types.TemplateGetBaseRequest{
				RepoURL: url,
			},
		},
	)
	if err != nil {
		return nil, err
	}
	return chart.Values, nil
}

type DeploymentHook struct {
	client                                                                    *api.Client
	resourceGroup                                                             *switchboardTypes.ResourceGroup
	gitInstallationID, projectID, clusterID, prID, actionID                   uint
	branchFrom, branchInto, namespace, repoName, repoOwner, prName, commitSHA string
}

func NewDeploymentHook(client *api.Client, resourceGroup *switchboardTypes.ResourceGroup, namespace string) (*DeploymentHook, error) {
	res := &DeploymentHook{
		client:        client,
		resourceGroup: resourceGroup,
		namespace:     namespace,
	}

	ghIDStr := os.Getenv("PORTER_GIT_INSTALLATION_ID")
	ghID, err := strconv.Atoi(ghIDStr)

	if err != nil {
		return nil, err
	}

	res.gitInstallationID = uint(ghID)

	prIDStr := os.Getenv("PORTER_PULL_REQUEST_ID")
	prID, err := strconv.Atoi(prIDStr)

	if err != nil {
		return nil, err
	}

	res.prID = uint(prID)

	res.projectID = config.Project

	if res.projectID == 0 {
		return nil, fmt.Errorf("project id must be set")
	}

	res.clusterID = config.Cluster

	if res.clusterID == 0 {
		return nil, fmt.Errorf("cluster id must be set")
	}

	branchFrom := os.Getenv("PORTER_BRANCH_FROM")
	res.branchFrom = branchFrom

	branchInto := os.Getenv("PORTER_BRANCH_INTO")
	res.branchInto = branchInto

	actionIDStr := os.Getenv("PORTER_ACTION_ID")
	actionID, err := strconv.Atoi(actionIDStr)

	if err != nil {
		return nil, err
	}

	res.actionID = uint(actionID)

	repoName := os.Getenv("PORTER_REPO_NAME")
	res.repoName = repoName

	repoOwner := os.Getenv("PORTER_REPO_OWNER")
	res.repoOwner = repoOwner

	prName := os.Getenv("PORTER_PR_NAME")
	res.prName = prName

	commit, err := git.LastCommit()

	if err != nil {
		return nil, fmt.Errorf(err.Error())
	}

	res.commitSHA = commit.Sha[:7]

	return res, nil
}

func (t *DeploymentHook) PreApply() error {
	// attempt to read the deployment -- if it doesn't exist, create it
	_, err := t.client.GetDeployment(
		context.Background(),
		t.projectID, t.gitInstallationID, t.clusterID,
		t.repoOwner, t.repoName,
		&types.GetDeploymentRequest{
			Namespace: t.namespace,
		},
	)

	// TODO: case this on the response status code rather than text
	if err != nil && strings.Contains(err.Error(), "deployment not found") {
		// in this case, create the deployment
		_, err = t.client.CreateDeployment(
			context.Background(),
			t.projectID, t.gitInstallationID, t.clusterID,
			t.repoOwner, t.repoName,
			&types.CreateDeploymentRequest{
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
			},
		)
	} else if err == nil {
		_, err = t.client.UpdateDeployment(
			context.Background(),
			t.projectID, t.gitInstallationID, t.clusterID,
			t.repoOwner, t.repoName,
			&types.UpdateDeploymentRequest{
				Namespace: t.namespace,
				CreateGHDeploymentRequest: &types.CreateGHDeploymentRequest{
					ActionID: t.actionID,
				},
				PRBranchFrom: t.branchFrom,
				CommitSHA:    t.commitSHA,
			},
		)
	}

	return err
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
			res[resource.Name] = fmt.Sprintf("{ .%s.ingress.porter_hosts[0] }", resource.Name)
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

	// finalize the deployment
	_, err := t.client.FinalizeDeployment(
		context.Background(),
		t.projectID, t.gitInstallationID, t.clusterID,
		t.repoOwner, t.repoName,
		&types.FinalizeDeploymentRequest{
			Namespace: t.namespace,
			Subdomain: strings.Join(subdomains, ","),
		},
	)

	return err
}

func (t *DeploymentHook) OnError(err error) {
	// if the deployment exists, throw an error for that deployment
	_, getDeplErr := t.client.GetDeployment(
		context.Background(),
		t.projectID, t.gitInstallationID, t.clusterID,
		t.repoOwner, t.repoName,
		&types.GetDeploymentRequest{
			Namespace: t.namespace,
		},
	)

	if getDeplErr == nil {
		_, err = t.client.UpdateDeploymentStatus(
			context.Background(),
			t.projectID, t.gitInstallationID, t.clusterID,
			t.repoOwner, t.repoName,
			&types.UpdateDeploymentStatusRequest{
				Namespace: t.namespace,
				CreateGHDeploymentRequest: &types.CreateGHDeploymentRequest{
					ActionID: t.actionID,
				},
				PRBranchFrom: t.branchFrom,
				Status:       string(types.DeploymentStatusFailed),
			},
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
		config := &ApplicationConfig{}

		err := mapstructure.Decode(res.Config, &config)
		if err != nil {
			continue
		}

		if config != nil && len(config.EnvGroups) > 0 {
			target := &Target{}

			err = getTarget(res.Target, target)

			if err != nil {
				return err
			}

			for _, group := range config.EnvGroups {
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

func (t *CloneEnvGroupHook) PostApply(populatedData map[string]interface{}) error {
	return nil
}

func (t *CloneEnvGroupHook) OnError(err error) {}
