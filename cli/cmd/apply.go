package cmd

import (
	"context"
	"fmt"
	"io/ioutil"
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

	deplNamespace := os.Getenv("PORTER_NAMESPACE")

	if deplNamespace == "" {
		return fmt.Errorf("namespace must be set by PORTER_NAMESPACE")
	}

	deploymentHook, err := NewDeploymentHook(client, resGroup, deplNamespace)

	if err != nil {
		return err
	}

	worker.RegisterHook("deployment", deploymentHook)

	return worker.Apply(resGroup, &switchboardTypes.ApplyOpts{
		BasePath: basePath,
	})
}

type Source struct {
	Name    string
	Repo    string
	Version string
}

type Target struct {
	Project   uint
	Cluster   uint
	Namespace string
}

type Config struct {
	Build struct {
		Method     string
		Context    string
		Dockerfile string
	}
	Values map[string]interface{}
}

type Driver struct {
	source              *Source
	target              *Target
	config              *Config
	sourceDefaultValues map[string]interface{}
	output              map[string]interface{}
	lookupTable         *map[string]drivers.Driver
	logger              *zerolog.Logger
	shouldApply         bool
}

func NewPorterDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &Driver{
		lookupTable: opts.DriverLookupTable,
		logger:      opts.Logger,
		output:      make(map[string]interface{}),
		shouldApply: true,
	}

	err := driver.getSource(resource.Source)
	if err != nil {
		return nil, err
	}
	if driver.source.Repo == "https://chart-addons.getporter.dev" {
		driver.shouldApply = false
	}

	err = driver.getTarget(resource.Target)
	if err != nil {
		return nil, err
	}

	resourceConfig, err := driver.getConfig(resource.Config)
	if err != nil {
		return nil, err
	}
	driver.config = resourceConfig

	return driver, nil
}

func (d *Driver) ShouldApply(resource *models.Resource) bool {
	return d.shouldApply
}

func (d *Driver) Apply(resource *models.Resource) (*models.Resource, error) {
	// TODO: call driver ConstructConfig

	client := GetAPIClient(config)

	if resource.Name == "" {
		return nil, fmt.Errorf("empty app name")
	}
	resource.Name = fmt.Sprintf("preview-%s", resource.Name)

	namespace := d.target.Namespace
	existingNamespaces, err := client.GetK8sNamespaces(context.Background(), d.target.Project, d.target.Cluster)
	if err != nil {
		return nil, err
	}
	namespaceFound := false
	for _, ns := range existingNamespaces.Items {
		if namespace == ns.Name {
			namespaceFound = true
			break
		}
	}
	if !namespaceFound {
		_, err := client.CreateNewK8sNamespace(
			context.Background(), d.target.Project, d.target.Cluster, namespace)
		if err != nil {
			return nil, err
		}
	}

	method := d.config.Build.Method
	if method != "pack" && method != "docker" {
		return nil, fmt.Errorf("method should either be \"docker\" or \"pack\"")
	}

	fullPath, err := filepath.Abs(d.config.Build.Context)
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
	if tag == "" {
		return nil, fmt.Errorf("could not find commit SHA to tag the image")
	}

	_, err = client.GetRelease(context.Background(), d.target.Project,
		d.target.Cluster, d.target.Namespace, resource.Name)
	if err != nil {
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

		createAgent := &deploy.CreateAgent{
			Client: client,
			CreateOpts: &deploy.CreateOpts{
				SharedOpts: &deploy.SharedOpts{
					ProjectID:       d.target.Project,
					ClusterID:       d.target.Cluster,
					Namespace:       namespace,
					LocalPath:       fullPath,
					LocalDockerfile: d.config.Build.Dockerfile,
					Method:          deploy.DeployBuildType(method),
				},
				Kind:        d.source.Name,
				ReleaseName: resource.Name,
				RegistryURL: registryURL,
			},
		}

		subdomain, err := createAgent.CreateFromDocker(d.config.Values, tag)

		return resource, handleSubdomainCreate(subdomain, err)
	}

	// update an existing release
	color.New(color.FgGreen).Println("Deploying app:", resource.Name)

	updateAgent, err := deploy.NewDeployAgent(client, resource.Name, &deploy.DeployOpts{
		SharedOpts: &deploy.SharedOpts{
			ProjectID:       d.target.Project,
			ClusterID:       d.target.Cluster,
			Namespace:       namespace,
			LocalPath:       fullPath,
			LocalDockerfile: d.config.Build.Dockerfile,
			OverrideTag:     tag,
			Method:          deploy.DeployBuildType(method),
		},
		Local: true,
	})
	if err != nil {
		return nil, err
	}

	buildEnv, err := updateAgent.GetBuildEnv()
	if err != nil {
		return nil, err
	}

	err = updateAgent.SetBuildEnv(buildEnv)
	if err != nil {
		return nil, err
	}

	err = updateAgent.Build()
	if err != nil {
		return nil, err
	}

	err = updateAgent.Push()
	if err != nil {
		return nil, err
	}

	err = updateAgent.UpdateImageAndValues(d.config.Values)
	if err != nil {
		return nil, err
	}

	d.output[resource.Name] = utils.CoalesceValues(d.sourceDefaultValues, d.config.Values)

	return resource, nil
}

func (d *Driver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func (d *Driver) getSource(genericSource map[string]interface{}) error {
	d.source = &Source{}

	// first read from env vars
	d.source.Name = os.Getenv("PORTER_SOURCE_NAME")
	d.source.Repo = os.Getenv("PORTER_SOURCE_REPO")
	d.source.Version = os.Getenv("PORTER_SOURCE_VERSION")

	// next, check for values in the YAML file
	if d.source.Name == "" {
		if name, ok := genericSource["name"]; ok {
			nameVal, ok := name.(string)
			if !ok {
				return fmt.Errorf("invalid name provided")
			}
			d.source.Name = nameVal
		}
	}
	if d.source.Name == "" {
		return fmt.Errorf("source name required")
	}

	if d.source.Repo == "" {
		if repo, ok := genericSource["repo"]; ok {
			repoVal, ok := repo.(string)
			if !ok {
				return fmt.Errorf("invalid repo provided")
			}
			d.source.Repo = repoVal
		}
	}
	if d.source.Version == "" {
		if version, ok := genericSource["version"]; ok {
			versionVal, ok := version.(string)
			if !ok {
				return fmt.Errorf("invalid version provided")
			}
			d.source.Version = versionVal
		}
	}

	// lastly, just put in the defaults
	if d.source.Version == "" {
		d.source.Version = "latest"
	}
	if d.source.Repo == "" {
		d.source.Repo = "https://charts.getporter.dev"
		values, err := existsInRepo(d.source.Name, d.source.Version, d.source.Repo)
		if err == nil {
			// found in "https://charts.getporter.dev"
			d.sourceDefaultValues = values
			return nil
		}

		d.source.Repo = "https://chart-addons.getporter.dev"
		values, err = existsInRepo(d.source.Name, d.source.Version, d.source.Repo)
		if err == nil {
			// found in https://chart-addons.getporter.dev
			d.sourceDefaultValues = values
			return nil
		}

		return fmt.Errorf("source does not exist in any repo")
	}

	values, err := existsInRepo(d.source.Name, d.source.Version, d.source.Repo)
	if err == nil {
		d.sourceDefaultValues = values
		return nil
	}

	return fmt.Errorf("source '%s' does not exist in repo '%s'", d.source.Name, d.source.Repo)
}

func (d *Driver) getTarget(genericTarget map[string]interface{}) error {
	d.target = &Target{}

	// first read from env vars
	if projectEnv := os.Getenv("PORTER_PROJECT"); projectEnv != "" {
		project, err := strconv.Atoi(projectEnv)
		if err != nil {
			return err
		}
		d.target.Project = uint(project)
	}
	if clusterEnv := os.Getenv("PORTER_CLUSTER"); clusterEnv != "" {
		cluster, err := strconv.Atoi(clusterEnv)
		if err != nil {
			return err
		}
		d.target.Cluster = uint(cluster)
	}
	d.target.Namespace = os.Getenv("PORTER_NAMESPACE")

	// next, check for values in the YAML file
	if d.target.Project == 0 {
		if project, ok := genericTarget["project"]; ok {
			projectVal, ok := project.(uint)
			if !ok {
				return fmt.Errorf("project value must be an integer")
			}
			d.target.Project = projectVal
		}
	}
	if d.target.Cluster == 0 {
		if cluster, ok := genericTarget["cluster"]; ok {
			clusterVal, ok := cluster.(uint)
			if !ok {
				return fmt.Errorf("cluster value must be an integer")
			}
			d.target.Cluster = clusterVal
		}
	}
	if d.target.Namespace == "" {
		if namespace, ok := genericTarget["namespace"]; ok {
			namespaceVal, ok := namespace.(string)
			if !ok {
				return fmt.Errorf("invalid namespace provided")
			}
			d.target.Namespace = namespaceVal
		}
	}

	// lastly, just put in the defaults
	if d.target.Project == 0 {
		d.target.Project = config.Project
	}
	if d.target.Cluster == 0 {
		d.target.Cluster = config.Cluster
	}
	if d.target.Namespace == "" {
		d.target.Namespace = "default"
	}

	return nil
}

func (d *Driver) getConfig(genericConfig map[string]interface{}) (*Config, error) {
	config := &Config{}

	err := mapstructure.Decode(genericConfig, config)
	if err != nil {
		return nil, err
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
	client                                        *api.Client
	resourceGroup                                 *switchboardTypes.ResourceGroup
	gitInstallationID, projectID, clusterID, prID uint
	namespace                                     string
}

func NewDeploymentHook(client *api.Client, resourceGroup *switchboardTypes.ResourceGroup, namespace string) (*DeploymentHook, error) {
	res := &DeploymentHook{
		client:        client,
		resourceGroup: resourceGroup,
		namespace:     namespace,
	}

	if ghIDStr := os.Getenv("PORTER_GIT_INSTALLATION_ID"); ghIDStr != "" {
		ghID, err := strconv.Atoi(ghIDStr)

		if err != nil {
			return nil, err
		}

		res.gitInstallationID = uint(ghID)
	} else if ghIDStr == "" {
		return nil, fmt.Errorf("Git installation ID must be defined, set by PORTER_GIT_INSTALLATION_ID")
	}

	if prIDStr := os.Getenv("PORTER_PULL_REQUEST_ID"); prIDStr != "" {
		prID, err := strconv.Atoi(prIDStr)

		if err != nil {
			return nil, err
		}

		res.prID = uint(prID)
	} else if prIDStr == "" {
		return nil, fmt.Errorf("Pull request ID must be defined, set by PORTER_PULL_REQUEST_ID")
	}

	res.projectID = config.Project

	if res.projectID == 0 {
		return nil, fmt.Errorf("project id must be set")
	}

	res.clusterID = config.Cluster

	if res.clusterID == 0 {
		return nil, fmt.Errorf("cluster id must be set")
	}

	return res, nil
}

func (t *DeploymentHook) PreApply() error {
	// attempt to read the deployment -- if it doesn't exist, create it
	_, err := t.client.GetDeployment(
		context.Background(),
		t.projectID, t.gitInstallationID, t.clusterID,
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
			&types.CreateDeploymentRequest{
				Namespace:     t.namespace,
				PullRequestID: t.prID,
			},
		)

		return err
	}

	return err
}

func (t *DeploymentHook) DataQueries() map[string]interface{} {
	// TODO: use the resource group to find all web applications that can have an exposed subdomain
	return map[string]interface{}{
		"first": "{ .test-deployment.spec.replicas }",
	}
}

func (t *DeploymentHook) PostApply(populatedData map[string]interface{}) error {
	// finalize the deployment
	_, err := t.client.FinalizeDeployment(
		context.Background(),
		t.projectID, t.gitInstallationID, t.clusterID,
		&types.FinalizeDeploymentRequest{
			Namespace: t.namespace,
			// TODO: populate the subdomain based on the query
			Subdomain: "google.com",
		},
	)

	return err
}
