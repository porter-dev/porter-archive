package client

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/server/handlers/porter_app"
	"github.com/porter-dev/porter/internal/models"
	appInternal "github.com/porter-dev/porter/internal/porter_app"

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

// GetAppManifests returns the manifests for a given app based on the latest successful app revision
func (c *Client) GetAppManifests(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
) (*porter_app.AppManifestsResponse, error) {
	resp := &porter_app.AppManifestsResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/manifests",
			projectID, clusterID, appName,
		),
		nil,
		resp,
	)

	return resp, err
}

// UpdateAppInput is the input struct to UpdateApp
type UpdateAppInput struct {
	ProjectID          uint
	ClusterID          uint
	Name               string
	ImageTagOverride   string
	GitSource          porter_app.GitSource
	DeploymentTargetId string
	CommitSHA          string
	AppRevisionID      string
	Base64AppProto     string
	Base64PorterYAML   string
	IsEnvOverride      bool
	WithPredeploy      bool
	Exact              bool
}

// UpdateApp updates a porter app
func (c *Client) UpdateApp(
	ctx context.Context,
	inp UpdateAppInput,
) (*porter_app.UpdateAppResponse, error) {
	resp := &porter_app.UpdateAppResponse{}

	req := &porter_app.UpdateAppRequest{
		Name:               inp.Name,
		GitSource:          inp.GitSource,
		DeploymentTargetId: inp.DeploymentTargetId,
		CommitSHA:          inp.CommitSHA,
		ImageTagOverride:   inp.ImageTagOverride,
		AppRevisionID:      inp.AppRevisionID,
		Base64AppProto:     inp.Base64AppProto,
		Base64PorterYAML:   inp.Base64PorterYAML,
		IsEnvOverride:      inp.IsEnvOverride,
		WithPredeploy:      inp.WithPredeploy,
		Exact:              inp.Exact,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/update",
			inp.ProjectID, inp.ClusterID,
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

// CurrentAppRevisionInput is the input struct to CurrentAppRevision
type CurrentAppRevisionInput struct {
	ProjectID uint
	ClusterID uint
	AppName   string
	// DeploymentTargetName is the name of the deployment target to get the current app revision for. One of this or DeploymentTargetID must be set.
	DeploymentTargetName string
	// DeploymentTargetID is the id of the deployment target to get the current app revision for. One of this or DeploymentTargetName must be set.
	DeploymentTargetID string
}

// CurrentAppRevision returns the currently deployed app revision for a given project, app name and deployment target
func (c *Client) CurrentAppRevision(
	ctx context.Context,
	input CurrentAppRevisionInput,
) (*porter_app.LatestAppRevisionResponse, error) {
	resp := &porter_app.LatestAppRevisionResponse{}

	req := &porter_app.LatestAppRevisionRequest{
		DeploymentTargetName: input.DeploymentTargetName,
		DeploymentTargetID:   input.DeploymentTargetID,
	}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/latest",
			input.ProjectID, input.ClusterID, input.AppName,
		),
		req,
		resp,
	)

	return resp, err
}

// CreatePorterAppDBEntryInput is the input struct to CreatePorterAppDBEntry
type CreatePorterAppDBEntryInput struct {
	AppName            string
	GitRepoName        string
	GitRepoID          uint
	GitBranch          string
	ImageRepository    string
	PorterYamlPath     string
	ImageTag           string
	Local              bool
	DeploymentTargetID string
}

// CreatePorterAppDBEntry creates an entry in the porter app
func (c *Client) CreatePorterAppDBEntry(
	ctx context.Context,
	projectID uint, clusterID uint,
	inp CreatePorterAppDBEntryInput,
) error {
	var sourceType appInternal.SourceType
	var image *appInternal.Image
	if inp.Local {
		sourceType = appInternal.SourceType_Local
	}
	if inp.GitRepoName != "" {
		sourceType = appInternal.SourceType_Github
	}
	if inp.ImageRepository != "" {
		sourceType = appInternal.SourceType_DockerRegistry
		image = &appInternal.Image{
			Repository: inp.ImageRepository,
			Tag:        inp.ImageTag,
		}
	}

	req := &porter_app.CreateAppRequest{
		Name:       inp.AppName,
		SourceType: sourceType,
		GitSource: porter_app.GitSource{
			GitBranch:   inp.GitBranch,
			GitRepoName: inp.GitRepoName,
			GitRepoID:   inp.GitRepoID,
		},
		Image:              image,
		PorterYamlPath:     inp.PorterYamlPath,
		DeploymentTargetID: inp.DeploymentTargetID,
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

// GetRevision returns an app revision
func (c *Client) GetRevision(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string, appRevisionId string,
) (*porter_app.GetAppRevisionResponse, error) {
	resp := &porter_app.GetAppRevisionResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/revisions/%s",
			projectID, clusterID, appName, appRevisionId,
		),
		nil,
		resp,
	)

	return resp, err
}

// GetRevisionStatus returns the status of an app revision
func (c *Client) GetRevisionStatus(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string, appRevisionId string,
) (*porter_app.GetAppRevisionStatusResponse, error) {
	resp := &porter_app.GetAppRevisionStatusResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/revisions/%s/status",
			projectID, clusterID, appName, appRevisionId,
		),
		nil,
		resp,
	)

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

// GetBuildEnv returns the build environment for a given app proto
func (c *Client) GetBuildEnv(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string, appRevisionId string,
) (*porter_app.GetBuildEnvResponse, error) {
	resp := &porter_app.GetBuildEnvResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/revisions/%s/build-env",
			projectID, clusterID, appName, appRevisionId,
		),
		nil,
		resp,
	)
	return resp, err
}

// GetAppEnvVariables returns all env variables for a given app
func (c *Client) GetAppEnvVariables(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string,
) (*porter_app.AppEnvVariablesResponse, error) {
	resp := &porter_app.AppEnvVariablesResponse{}

	req := &porter_app.AppEnvVariablesRequest{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/env-variables",
			projectID, clusterID, appName,
		),
		req,
		resp,
	)

	return resp, err
}

// GetBuildFromRevision returns the build environment for a given app proto
func (c *Client) GetBuildFromRevision(
	ctx context.Context,
	projectID uint, clusterID uint,
	appName string, appRevisionId string,
) (*porter_app.GetBuildFromRevisionResponse, error) {
	resp := &porter_app.GetBuildFromRevisionResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/revisions/%s/build",
			projectID, clusterID, appName, appRevisionId,
		),
		nil,
		resp,
	)

	return resp, err
}

// ReportRevisionStatusInput is the input struct to ReportRevisionStatus
type ReportRevisionStatusInput struct {
	ProjectID     uint
	ClusterID     uint
	AppName       string
	AppRevisionID string
	PRNumber      int
	CommitSHA     string
}

// ReportRevisionStatus reports the status of an app revision to external services
func (c *Client) ReportRevisionStatus(
	ctx context.Context,
	inp ReportRevisionStatusInput,
) (*porter_app.ReportRevisionStatusResponse, error) {
	resp := &porter_app.ReportRevisionStatusResponse{}

	req := &porter_app.ReportRevisionStatusRequest{
		PRNumber:  inp.PRNumber,
		CommitSHA: inp.CommitSHA,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/revisions/%s/status",
			inp.ProjectID, inp.ClusterID, inp.AppName, inp.AppRevisionID,
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
	Base64AppProto string,
) (*porter_app.UpdateAppEnvironmentResponse, error) {
	resp := &porter_app.UpdateAppEnvironmentResponse{}

	req := &porter_app.UpdateAppEnvironmentRequest{
		DeploymentTargetID: deploymentTargetID,
		Variables:          variables,
		Secrets:            secrets,
		HardUpdate:         false,
		Base64AppProto:     Base64AppProto,
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

// PorterYamlV2Pods gets all pods for a given deployment target id and app name
func (c *Client) PorterYamlV2Pods(
	ctx context.Context,
	projectID, clusterID uint,
	porterAppName string,
	deploymentTargetName string,
) (*types.GetReleaseAllPodsResponse, error) {
	req := &porter_app.PodStatusRequest{
		DeploymentTargetName: deploymentTargetName,
	}

	resp := &types.GetReleaseAllPodsResponse{}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/pods",
			projectID, clusterID,
			porterAppName,
		),
		req,
		resp,
	)

	return resp, err
}

// UpdateImage updates the image for a porter app (porter yaml v2 only)
func (c *Client) UpdateImage(
	ctx context.Context,
	projectID, clusterID uint,
	appName, deploymentTargetName, tag string,
) (*porter_app.UpdateImageResponse, error) {
	req := &porter_app.UpdateImageRequest{
		Tag:                  tag,
		DeploymentTargetName: deploymentTargetName,
	}

	resp := &porter_app.UpdateImageResponse{}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/update-image",
			projectID, clusterID, appName,
		),
		&req,
		resp,
	)

	return resp, err
}

// ListAppRevisions lists the last ten app revisions for a given app
func (c *Client) ListAppRevisions(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
	deploymentTargetID string,
) (*porter_app.ListAppRevisionsResponse, error) {
	resp := &porter_app.ListAppRevisionsResponse{}

	req := &porter_app.ListAppRevisionsRequest{
		DeploymentTargetID: deploymentTargetID,
	}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/revisions",
			projectID, clusterID,
			appName,
		),
		req,
		resp,
	)

	return resp, err
}

// RollbackRevision reverts an app to a previous revision
func (c *Client) RollbackRevision(
	ctx context.Context,
	projectID, clusterID uint,
	appName string,
	deploymentTargetName string,
) (*porter_app.RollbackAppRevisionResponse, error) {
	resp := &porter_app.RollbackAppRevisionResponse{}

	req := &porter_app.RollbackAppRevisionRequest{
		DeploymentTargetName: deploymentTargetName,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/rollback",
			projectID, clusterID,
			appName,
		),
		req,
		resp,
	)

	return resp, err
}

// RunAppJob runs a job for an app
func (c *Client) RunAppJob(
	ctx context.Context,
	projectID, clusterID uint,
	appName string, jobName string,
	deploymentTargetName string,
) (*porter_app.RunAppJobResponse, error) {
	resp := &porter_app.RunAppJobResponse{}

	req := &porter_app.RunAppJobRequest{
		ServiceName:          jobName,
		DeploymentTargetName: deploymentTargetName,
	}

	err := c.postRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/run",
			projectID, clusterID,
			appName,
		),
		req,
		resp,
	)

	return resp, err
}

// RunAppJobStatusInput contains all the information necessary to check the status of a job
type RunAppJobStatusInput struct {
	// AppName is the name of the app associated with the job
	AppName string

	// Cluster is the id of the cluster against which to retrieve a helm agent for
	ClusterID uint

	// DeploymentTargetName is the id of the deployment target the job was run against
	DeploymentTargetName string

	// ServiceName is the name of the app service that was triggered
	ServiceName string

	// JobRunID is the UID returned from the /apps/{porter_app_name}/run endpoint
	JobRunID string

	// ProjectID is the project in which the cluster exists
	ProjectID uint
}

// RunAppJobStatus gets the status for a job app run
func (c *Client) RunAppJobStatus(
	ctx context.Context,
	input RunAppJobStatusInput,
) (*porter_app.AppJobRunStatusResponse, error) {
	resp := &porter_app.AppJobRunStatusResponse{}

	req := &porter_app.AppJobRunStatusRequest{
		DeploymentTargetName: input.DeploymentTargetName,
		JobRunID:             input.JobRunID,
		ServiceName:          input.ServiceName,
	}

	err := c.getRequest(
		fmt.Sprintf(
			"/projects/%d/clusters/%d/apps/%s/run-status",
			input.ProjectID, input.ClusterID,
			input.AppName,
		),
		req,
		resp,
	)

	return resp, err
}
