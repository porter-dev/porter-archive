package cmd

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"strconv"

	"github.com/cli/cli/git"
	"github.com/mitchellh/mapstructure"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
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
	Short: "Applies the provided porter.yaml to a project",
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
	worker.RegisterDriver("", NewPorterDriver) // FIXME: workaround for when driver is not present
	worker.RegisterDriver("porter.deploy", NewPorterDriver)

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
	source      *Source
	target      *Target
	config      *Config
	output      map[string]interface{}
	lookupTable *map[string]drivers.Driver
	logger      *zerolog.Logger
}

func NewPorterDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &Driver{
		lookupTable: opts.DriverLookupTable,
		logger:      opts.Logger,
	}

	source, err := getSource(resource.Source)
	if err != nil {
		return nil, err
	}
	driver.source = source

	target, err := getTarget(resource.Target)
	if err != nil {
		return nil, err
	}
	driver.target = target

	config, err := getConfig(resource.Config)
	if err != nil {
		return nil, err
	}
	driver.config = config

	return driver, nil
}

func (d *Driver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *Driver) Apply(resource *models.Resource) (*models.Resource, error) {
	client := GetAPIClient(config)

	// TODO: use source.repo, source.version
	config.SetProject(d.target.Project)
	config.SetCluster(d.target.Cluster)

	namespace = d.target.Namespace
	existingNamespaces, err := client.GetK8sNamespaces(context.Background(), config.Project, config.Cluster)
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
			context.Background(), config.Project, config.Cluster, namespace)
		if err != nil {
			return nil, err
		}
	}

	method = d.config.Build.Method
	if method == "" {
		return nil, fmt.Errorf("method should either be \"docker\" or \"pack\"")
	} else if method == "docker" {
		dockerfile = d.config.Build.Dockerfile
	}

	localPath = d.config.Build.Context
	source = "local"
	valuesObj = d.config.Values

	if resource.Name == "" {
		return nil, fmt.Errorf("empty app name")
	}
	resource.Name = fmt.Sprintf("preview-%s", resource.Name)

	_, err = client.GetRelease(context.Background(), config.Project, config.Cluster, d.target.Namespace, resource.Name)
	if err != nil {
		// create new app
		name = resource.Name

		regList, err := client.ListRegistries(context.Background(), config.Project)
		if err != nil {
			return nil, err
		}
		if len(*regList) > 0 {
			registryURL = (*regList)[0].URL
		}

		err = createFull(nil, client, []string{d.source.Name})
		if err != nil {
			return nil, err
		}
	}
	app = resource.Name
	tag = os.Getenv("PORTER_TAG")
	if tag == "" {
		commit, err := git.LastCommit()
		if err != nil {
			return nil, err
		}
		tag = commit.Sha
	}
	if tag == "" {
		return nil, fmt.Errorf("could not find commit SHA to tag the image")
	}

	err = updateFull(nil, client, []string{})
	if err != nil {
		return nil, err
	}

	return resource, nil
}

func (d *Driver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func getSource(genericSource map[string]interface{}) (*Source, error) {
	source := &Source{}

	// first read from env vars
	source.Name = os.Getenv("PORTER_SOURCE_NAME")
	source.Repo = os.Getenv("PORTER_SOURCE_REPO")
	source.Version = os.Getenv("PORTER_SOURCE_VERSION")

	// next, check for values in the YAML file
	if source.Name == "" {
		if name, ok := genericSource["name"]; ok {
			nameVal, ok := name.(string)
			if !ok {
				return nil, fmt.Errorf("invalid name provided")
			}
			source.Name = nameVal
		}
	}
	if source.Repo == "" {
		if repo, ok := genericSource["repo"]; ok {
			repoVal, ok := repo.(string)
			if !ok {
				return nil, fmt.Errorf("invalid repo provided")
			}
			source.Repo = repoVal
		}
	}
	if source.Version == "" {
		if version, ok := genericSource["version"]; ok {
			versionVal, ok := version.(string)
			if !ok {
				return nil, fmt.Errorf("invalid version provided")
			}
			source.Version = versionVal
		}
	}

	// lastly, just put in the defaults
	if source.Name == "" || source.Repo == "" || source.Version == "" {
		// default to these values when any one of the source values are empty
		// this makes sense because it might save us from version mismatches and other mishaps
		source.Name = "web"
		source.Repo = "https://charts.getporter.dev"
		source.Version = "v0.13.0"
	}

	return source, nil
}

func getTarget(genericTarget map[string]interface{}) (*Target, error) {
	target := &Target{}

	// first read from env vars
	if projectEnv := os.Getenv("PORTER_PROJECT"); projectEnv != "" {
		project, err := strconv.Atoi(projectEnv)
		if err != nil {
			return nil, err
		}
		target.Project = uint(project)
	}
	if clusterEnv := os.Getenv("PORTER_CLUSTER"); clusterEnv != "" {
		cluster, err := strconv.Atoi(clusterEnv)
		if err != nil {
			return nil, err
		}
		target.Cluster = uint(cluster)
	}
	target.Namespace = os.Getenv("PORTER_NAMESPACE")

	// next, check for values in the YAML file
	if target.Project == 0 {
		if project, ok := genericTarget["project"]; ok {
			projectVal, ok := project.(uint)
			if !ok {
				return nil, fmt.Errorf("project value must be an integer")
			}
			target.Project = projectVal
		}
	}
	if target.Cluster == 0 {
		if cluster, ok := genericTarget["cluster"]; ok {
			clusterVal, ok := cluster.(uint)
			if !ok {
				return nil, fmt.Errorf("cluster value must be an integer")
			}
			target.Cluster = clusterVal
		}
	}
	if target.Namespace == "" {
		if namespace, ok := genericTarget["namespace"]; ok {
			namespaceVal, ok := namespace.(string)
			if !ok {
				return nil, fmt.Errorf("invalid namespace provided")
			}
			target.Namespace = namespaceVal
		}
	}

	// lastly, just put in the defaults
	if target.Project == 0 {
		target.Project = config.Project
	}
	if target.Cluster == 0 {
		target.Cluster = config.Cluster
	}
	if target.Namespace == "" {
		target.Namespace = "default"
	}

	return target, nil
}

func getConfig(genericConfig map[string]interface{}) (*Config, error) {
	config := &Config{}

	err := mapstructure.Decode(genericConfig, config)
	if err != nil {
		return nil, err
	}

	return config, nil
}
