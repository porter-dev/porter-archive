package preview

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/cli/cli/git"
	"github.com/fatih/color"
	"github.com/mitchellh/mapstructure"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/porter/cli/cmd/deploy"
	"github.com/porter-dev/porter/cli/cmd/deploy/wait"
	"github.com/porter-dev/porter/internal/templater/utils"
	"github.com/porter-dev/switchboard/pkg/drivers"
	"github.com/porter-dev/switchboard/pkg/models"
)

type UpdateConfigDriverConfig struct {
	WaitForJob bool

	// If set to true, this does not run an update, it only creates the initial application and job,
	// skipping subsequent updates
	OnlyCreate bool

	UpdateConfig struct {
		Image string
		Tag   string
	} `mapstructure:"update_config"`

	EnvGroups []types.EnvGroupMeta `mapstructure:"env_groups"`

	Values map[string]interface{}
}

type UpdateConfigDriver struct {
	source      *Source
	target      *Target
	config      *UpdateConfigDriverConfig
	lookupTable *map[string]drivers.Driver
	output      map[string]interface{}
}

func NewUpdateConfigDriver(resource *models.Resource, opts *drivers.SharedDriverOpts) (drivers.Driver, error) {
	driver := &UpdateConfigDriver{
		lookupTable: opts.DriverLookupTable,
		output:      make(map[string]interface{}),
	}

	source, err := GetSource(resource.Name, resource.Source)
	if err != nil {
		return nil, err
	}

	driver.source = source

	target, err := GetTarget(resource.Name, resource.Target)
	if err != nil {
		return nil, err
	}

	if target.AppName == "" {
		return nil, fmt.Errorf("target app_name is missing")
	}

	driver.target = target

	return driver, nil
}

func (d *UpdateConfigDriver) ShouldApply(resource *models.Resource) bool {
	return true
}

func (d *UpdateConfigDriver) Apply(resource *models.Resource) (*models.Resource, error) {
	updateConfigDriverConfig, err := d.getConfig(resource)
	if err != nil {
		return nil, err
	}

	d.config = updateConfigDriverConfig

	client := config.GetAPIClient()

	_, err = client.GetRelease(
		context.Background(),
		d.target.Project,
		d.target.Cluster,
		d.target.Namespace,
		d.target.AppName,
	)

	shouldCreate := err != nil

	tag := os.Getenv("PORTER_TAG")

	if tag == "" {
		tag = d.config.UpdateConfig.Tag
	}

	if tag == "" {
		commit, err := git.LastCommit()

		if err != nil {
			return nil, err
		}

		tag = commit.Sha[:7]
	}

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

	var repoSuffix string

	if repoName := os.Getenv("PORTER_REPO_NAME"); repoName != "" {
		if repoOwner := os.Getenv("PORTER_REPO_OWNER"); repoOwner != "" {
			repoSuffix = strings.ToLower(strings.ReplaceAll(fmt.Sprintf("%s-%s", repoOwner, repoName), "_", "-"))
		}
	}

	sharedOpts := &deploy.SharedOpts{
		ProjectID:   d.target.Project,
		ClusterID:   d.target.Cluster,
		OverrideTag: tag,
		Namespace:   d.target.Namespace,
		Method:      "registry",
		EnvGroups:   d.config.EnvGroups,
	}

	if shouldCreate {
		color.New(color.FgYellow).Printf("Could not read release %s/%s: attempting creation\n", d.target.Namespace, d.target.AppName)

		createAgent := &deploy.CreateAgent{
			Client: client,
			CreateOpts: &deploy.CreateOpts{
				SharedOpts:  sharedOpts,
				Kind:        d.source.Name,
				ReleaseName: d.target.AppName,
				RegistryURL: registryURL,
				RepoSuffix:  repoSuffix,
			},
		}

		regID, imageURL, err := createAgent.GetImageRepoURL(d.target.AppName, sharedOpts.Namespace)

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

		_, err = createAgent.CreateFromRegistry(d.config.UpdateConfig.Image, d.config.Values)

		if err != nil {
			return nil, err
		}
	} else {
		updateAgent, err := deploy.NewDeployAgent(client, d.target.AppName, &deploy.DeployOpts{
			SharedOpts: sharedOpts,
			Local:      false,
		})

		if err != nil {
			return nil, err
		}

		err = updateAgent.UpdateImageAndValues(d.config.Values)

		if err != nil {
			return nil, err
		}
	}

	if d.source.Name == "job" && updateConfigDriverConfig.WaitForJob && (shouldCreate || !updateConfigDriverConfig.OnlyCreate) {
		color.New(color.FgYellow).Printf("Waiting for job '%s' to finish\n", resource.Name)

		err = wait.WaitForJob(client, &wait.WaitOpts{
			ProjectID: d.target.Project,
			ClusterID: d.target.Cluster,
			Namespace: d.target.Namespace,
			Name:      d.target.AppName,
		})

		if err != nil {
			return nil, err
		}
	}

	err = d.assignOutput(resource, client)

	if err != nil {
		return nil, err
	}

	return resource, nil
}

func (d *UpdateConfigDriver) Output() (map[string]interface{}, error) {
	return d.output, nil
}

func (d *UpdateConfigDriver) getConfig(resource *models.Resource) (*UpdateConfigDriverConfig, error) {
	populatedConf, err := drivers.ConstructConfig(&drivers.ConstructConfigOpts{
		RawConf:      resource.Config,
		LookupTable:  *d.lookupTable,
		Dependencies: resource.Dependencies,
	})

	if err != nil {
		return nil, err
	}

	config := &UpdateConfigDriverConfig{}

	err = mapstructure.Decode(populatedConf, config)

	if err != nil {
		return nil, err
	}

	return config, nil
}

func (d *UpdateConfigDriver) assignOutput(resource *models.Resource, client *api.Client) error {
	release, err := client.GetRelease(
		context.Background(),
		d.target.Project,
		d.target.Cluster,
		d.target.Namespace,
		d.target.AppName,
	)

	if err != nil {
		return err
	}

	d.output = utils.CoalesceValues(d.source.SourceValues, release.Config)

	return nil
}
