package cmd

import (
	"io/ioutil"
	"os"
	"strconv"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
	"github.com/porter-dev/switchboard/pkg/parser"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
	"github.com/porter-dev/switchboard/pkg/worker"
	"github.com/porter-dev/switchboard/utils/objutils"
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

	return driver, nil
}

func (d *Driver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *Driver) Apply(resource *models.Resource) (*models.Resource, error) {
	app = resource.Name
	config.SetProject(d.target.Project)
	config.SetCluster(d.target.Cluster)
	err := updateFull(nil, GetAPIClient(config), []string{})
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

	name, err := objutils.GetNestedString(genericSource, "name")
	if err != nil {
		return nil, err
	}
	source.Name = name

	repo, err := objutils.GetNestedString(genericSource, "repo")
	if err != nil {
		return nil, err
	}
	source.Repo = repo

	version, err := objutils.GetNestedString(genericSource, "version")
	if err != nil {
		return nil, err
	}
	source.Version = version

	return source, nil
}

func getTarget(genericTarget map[string]interface{}) (*Target, error) {
	target := &Target{}

	project, err := objutils.GetNestedString(genericTarget, "project")
	if err != nil {
		return nil, err
	}
	projectNum, err := strconv.Atoi(project)
	if err != nil {
		return nil, err
	}
	target.Project = uint(projectNum)

	cluster, err := objutils.GetNestedString(genericTarget, "cluster")
	if err != nil {
		return nil, err
	}
	clusterNum, err := strconv.Atoi(cluster)
	if err != nil {
		return nil, err
	}
	target.Cluster = uint(clusterNum)

	namespace, err := objutils.GetNestedString(genericTarget, "namespace")
	if err != nil {
		return nil, err
	}
	target.Namespace = namespace

	return target, nil
}
