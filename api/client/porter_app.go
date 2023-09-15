package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/server/handlers/porter_app"
	"github.com/porter-dev/porter/internal/models"

	"github.com/porter-dev/porter/api/types"
)

func (c *Client) NewGetPorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/applications/%s",
			projectID, clusterID, appName,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) NewCreatePorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
	req *types.CreatePorterAppRequest,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/applications/%s",
			projectID, clusterID, appName,
		),
		req,
		resp,
	)

	return resp, err
}

// NewCreateOrUpdatePorterAppEvent will create a porter app event if one does not exist, or else it will update the existing one if an ID is passed in the object
func (c *Client) NewCreateOrUpdatePorterAppEvent(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
	req *types.CreateOrUpdatePorterAppEventRequest,
) (types.PorterAppEvent, error) {
	resp := &types.PorterAppEvent{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/applications/%s/events",
			projectID, clusterID, appName,
		),
		req,
		resp,
	)

	return *resp, err
}

// TODO: remove these functions once they are no longer called (check telemetry)
func (c *Client) GetPorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	stackName string,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s",
			projectID, clusterID, stackName,
		),
		nil,
		resp,
	)

	return resp, err
}

func (c *Client) CreatePorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	name string,
	req *types.CreatePorterAppRequest,
) (*types.PorterApp, error) {
	resp := &types.PorterApp{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s",
			projectID, clusterID, name,
		),
		req,
		resp,
	)

	return resp, err
}

// CreateOrUpdatePorterAppEvent will create a porter app event if one does not exist, or else it will update the existing one if an ID is passed in the object
func (c *Client) CreateOrUpdatePorterAppEvent(
	ctx context.Context,
	projectID, clusterID uint,
	name string,
	req *types.CreateOrUpdatePorterAppEventRequest,
) (types.PorterAppEvent, error) {
	resp := &types.PorterAppEvent{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/stacks/%s/events",
			projectID, clusterID, name,
		),
		req,
		resp,
	)

	return *resp, err
}

// ListEnvGroups (List all Env Groups for a given cluster)
func (c *Client) ListEnvGroups(
	ctx context.Context,
	projectID, clusterID uint,
) (types.ListEnvironmentGroupsResponse, error) {
	resp := &types.ListEnvironmentGroupsResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/environment-groups",
			projectID, clusterID,
		),
		nil,
		resp,
	)

	return *resp, err
}

// ParseYAML takes in a base64 encoded porter yaml and returns an app proto
func (c *Client) ParseYAML(
	ctx context.Context,
	projectID, clusterID uint,
	b64Yaml string,
	appName string,
) (*porter_app.ParsePorterYAMLToProtoResponse, error) {
	resp := &porter_app.ParsePorterYAMLToProtoResponse{}

	req := &porter_app.ParsePorterYAMLToProtoRequest{
		B64Yaml: b64Yaml,
		AppName: appName,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/parse",
			projectID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}

// ValidatePorterApp takes in a base64 encoded app definition that is potentially partial and returns a complete definition
// using any previous app revisions and defaults
func (c *Client) ValidatePorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
	base64AppProto string,
	deploymentTarget string,
	commitSHA string,
) (*porter_app.ValidatePorterAppResponse, error) {
	resp := &porter_app.ValidatePorterAppResponse{}

	req := &porter_app.ValidatePorterAppRequest{
		AppName:            appName,
		Base64AppProto:     base64AppProto,
		DeploymentTargetId: deploymentTarget,
		CommitSHA:          commitSHA,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/validate",
			projectID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}

// ApplyPorterApp takes in a base64 encoded app definition and applies it to the cluster
func (c *Client) ApplyPorterApp(
	ctx context.Context,
	projectID, clusterID uint,
	base64AppProto string,
	deploymentTarget string,
	appRevisionID string,
	forceBuild bool,
) (*porter_app.ApplyPorterAppResponse, error) {
	resp := &porter_app.ApplyPorterAppResponse{}

	req := &porter_app.ApplyPorterAppRequest{
		Base64AppProto:     base64AppProto,
		DeploymentTargetId: deploymentTarget,
		AppRevisionID:      appRevisionID,
		ForceBuild:         forceBuild,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/apply",
			projectID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}

// DefaultDeploymentTarget returns the default deployment target for a given project and cluster
func (c *Client) DefaultDeploymentTarget(
	ctx context.Context,
	projectID, clusterID uint,
) (*porter_app.DefaultDeploymentTargetResponse, error) {
	resp := &porter_app.DefaultDeploymentTargetResponse{}

	req := &porter_app.DefaultDeploymentTargetRequest{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/default-deployment-target",
			projectID, clusterID,
		),
		req,
		resp,
	)

	return resp, err
}

// CurrentAppRevision returns the currently deployed app revision for a given project, app name and deployment target
func (c *Client) CurrentAppRevision(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string, deploymentTarget string,
) (*porter_app.LatestAppRevisionResponse, error) {
	resp := &porter_app.LatestAppRevisionResponse{}

	req := &porter_app.LatestAppRevisionRequest{
		DeploymentTargetID: deploymentTarget,
	}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/latest",
			projectID, clusterID, appName,
		),
		req,
		resp,
	)

	return resp, err
}

// CreatePorterAppDBEntryInput is the input struct to CreatePorterAppDBEntry
type CreatePorterAppDBEntryInput struct {
	AppName         string
	GitRepoName     string
	GitRepoID       uint
	GitBranch       string
	ImageRepository string
	PorterYamlPath  string
	ImageTag        string
	Local           bool
}

// CreatePorterAppDBEntry creates an entry in the porter app
func (c *Client) CreatePorterAppDBEntry(
	ctx context.Context,
	projectID uint, clusterID uint,
	inp CreatePorterAppDBEntryInput,
) error {
	var sourceType porter_app.SourceType
	var image *porter_app.Image
	if inp.Local {
		sourceType = porter_app.SourceType_Local
	}
	if inp.GitRepoName != "" {
		sourceType = porter_app.SourceType_Github
	}
	if inp.ImageRepository != "" {
		sourceType = porter_app.SourceType_DockerRegistry
		image = &porter_app.Image{
			Repository: inp.ImageRepository,
			Tag:        inp.ImageTag,
		}
	}
	if sourceType == "" {
		return fmt.Errorf("cannot determine source type")
	}

	req := &porter_app.CreateAppRequest{
		Name:           inp.AppName,
		SourceType:     sourceType,
		GitBranch:      inp.GitBranch,
		GitRepoName:    inp.GitRepoName,
		GitRepoID:      inp.GitRepoID,
		PorterYamlPath: inp.PorterYamlPath,
		Image:          image,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/create",
			projectID, clusterID,
		),
		req,
		&types.PorterApp{},
	)

	return err
}

// CreateSubdomain returns a subdomain for a given service that point to the ingress-nginx service in the cluster
func (c *Client) CreateSubdomain(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string, serviceName string,
) (*porter_app.CreateSubdomainResponse, error) {
	resp := &porter_app.CreateSubdomainResponse{}

	req := &porter_app.CreateSubdomainRequest{
		ServiceName: serviceName,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/subdomain",
			projectID, clusterID, appName,
		),
		req,
		resp,
	)

	return resp, err
}

// PredeployStatus checks the current status of a predeploy job for an app revision
func (c *Client) PredeployStatus(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string, appRevisionId string,
) (*porter_app.PredeployStatusResponse, error) {
	resp := &porter_app.PredeployStatusResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/%s/predeploy-status",
			projectID, clusterID, appName, appRevisionId,
		),
		nil,
		resp,
	)

	if resp.Status == "" {
		return nil, fmt.Errorf("no predeploy status found")
	}

	return resp, err
}

// UpdateRevisionStatus updates the status of an app revision
func (c *Client) UpdateRevisionStatus(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string, appRevisionId string,
	status models.AppRevisionStatus,
) (*porter_app.UpdateAppRevisionStatusResponse, error) {
	resp := &porter_app.UpdateAppRevisionStatusResponse{}

	req := &porter_app.UpdateAppRevisionStatusRequest{
		Status: status,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/revisions/%s",
			projectID, clusterID, appName, appRevisionId,
		),
		req,
		resp,
	)

	return resp, err
}

// CreateOrUpdateAppEnvironment updates the app environment group and creates it if it doesn't exist
func (c *Client) CreateOrUpdateAppEnvironment(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string,
	deploymentTargetID string,
	variables map[string]string,
	secrets map[string]string,
) (*porter_app.UpdateAppEnvironmentResponse, error) {
	resp := &porter_app.UpdateAppEnvironmentResponse{}

	req := &porter_app.UpdateAppEnvironmentRequest{
		DeploymentTargetID: deploymentTargetID,
		Variables:          variables,
		Secrets:            secrets,
		HardUpdate:         false,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/update-environment",
			projectID, clusterID, appName,
		),
		req,
		resp,
	)

	return resp, err
}
