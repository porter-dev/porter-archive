package cmd

import (
	"io/ioutil"
	"os"
	"path/filepath"

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
		Method  string
		Context string
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

	if resource.Source != nil {
		source, err := getSource(resource.Source)
		if err != nil {
			return nil, err
		}
		driver.source = source
	} else {
		// default source
		driver.source = &Source{
			Name:    "web",
			Repo:    "https://charts.getporter.dev",
			Version: "v0.13.0",
		}
	}

	if resource.Target != nil {
		target, err := getTarget(resource.Target)
		if err != nil {
			return nil, err
		}
		driver.target = target
	} else {
		// default target
		driver.target = &Target{
			Project:   config.Project,
			Cluster:   config.Cluster,
			Namespace: "default",
		}
	}

	if resource.Config != nil {
		config, err := getConfig(resource.Config)
		if err != nil {
			return nil, err
		}
		driver.config = config
	}

	return driver, nil
}

func (d *Driver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *Driver) Apply(resource *models.Resource) (*models.Resource, error) {
	// TODO: use source.repo, source.version, config.values
	name = resource.Name
	source = "local"
	namespace = d.target.Namespace
	if d.config != nil {
		method = d.config.Build.Method
		absPath, err := filepath.Abs(d.config.Build.Context)
		if err != nil {
			return nil, err
		}
		localPath = absPath
	}
	config.SetProject(d.target.Project)
	config.SetCluster(d.target.Cluster)
	err := createFull(nil, GetAPIClient(config), []string{d.source.Name})
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

	err := mapstructure.Decode(genericSource, source)
	if err != nil {
		return nil, err
	}

	return source, nil
}

func getTarget(genericTarget map[string]interface{}) (*Target, error) {
	target := &Target{}

	err := mapstructure.Decode(genericTarget, target)
	if err != nil {
		return nil, err
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
