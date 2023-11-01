package porter_app

import (
	"errors"
	"net/http"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ErrMissingSourceType is returned when the source type is not specified
var ErrMissingSourceType = errors.New("missing source type")

// CreateAppHandler is the handler for the /apps/create endpoint
type CreateAppHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCreateAppHandler handles POST requests to the endpoint /apps/create
func NewCreateAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateAppHandler {
	return &CreateAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

type GitSource struct {
	GitBranch   string `json:"git_branch"`
	GitRepoName string `json:"git_repo_name"`
	GitRepoID   uint   `json:"git_repo_id"`
}

// CreateAppRequest is the request object for the /apps/create endpoint
type CreateAppRequest struct {
	GitSource            `json:",inline"`
	SourceType           porter_app.SourceType `json:"type"`
	PorterYamlPath       string                `json:"porter_yaml_path"`
	Image                *porter_app.Image     `json:"image,omitempty"`
	Name                 string                `json:"name"`
	DeploymentTargetName string                `json:"deployment_target_name,omitempty"`
	DeploymentTargetID   string                `json:"deployment_target_id,omitempty"`
}

// CreateGithubAppInput is the input for creating an app with a github source
type CreateGithubAppInput struct {
	ProjectID           uint
	ClusterID           uint
	Name                string
	GitBranch           string
	GitRepoName         string
	PorterYamlPath      string
	GitRepoID           uint
	PorterAppRepository repository.PorterAppRepository
}

// CreateDockerRegistryAppInput is the input for creating an app with a docker registry source
type CreateDockerRegistryAppInput struct {
	ProjectID           uint
	ClusterID           uint
	Name                string
	Repository          string
	Tag                 string
	PorterAppRepository repository.PorterAppRepository
}

// CreateLocalAppInput is the input for creating an app that is built locally via the cli
type CreateLocalAppInput struct {
	ProjectID           uint
	ClusterID           uint
	Name                string
	PorterAppRepository repository.PorterAppRepository
}

func (c *CreateAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-app")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	request := &CreateAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.Name == "" {
		err := telemetry.Error(ctx, span, nil, "name is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: request.Name})

	porterApp, err := porter_app.CreateOrGetAppRecord(ctx, porter_app.CreateOrGetAppRecordInput{
		ClusterID:           cluster.ID,
		ProjectID:           project.ID,
		Name:                request.Name,
		SourceType:          request.SourceType,
		GitBranch:           request.GitBranch,
		GitRepoName:         request.GitRepoName,
		GitRepoID:           request.GitRepoID,
		PorterYamlPath:      request.PorterYamlPath,
		Image:               request.Image,
		PorterAppRepository: c.Repo().PorterApp(),
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating porter app")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-id", Value: porterApp.ID})

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-name", Value: request.DeploymentTargetName},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
	)

	if request.DeploymentTargetName != "" || request.DeploymentTargetID != "" {
		createAppInstanceReq := connect.NewRequest(&porterv1.CreateAppInstanceRequest{
			ProjectId: int64(project.ID),
			AppName:   request.Name,
			DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
				Id:   request.DeploymentTargetID,
				Name: request.DeploymentTargetName,
			},
			PorterAppId: int64(porterApp.ID),
		})

		createAppInstanceResp, err := c.Config().ClusterControlPlaneClient.CreateAppInstance(ctx, createAppInstanceReq)
		if err != nil {
			// ignore error until app instances are fully supported: POR-2056
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "create-app-instance-error", Value: err.Error()})
		}

		if createAppInstanceResp == nil || createAppInstanceResp.Msg == nil {
			// ignore error until app instances are fully supported: POR-2056
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "create-app-instance-nil", Value: true})
		} else {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-instance-id", Value: createAppInstanceResp.Msg.AppInstanceId})
		}
	}

	c.WriteResult(w, r, porterApp)
}
