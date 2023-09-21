package porter_app

import (
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/api-contracts/generated/go/helpers"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// ValidatePorterAppHandler is handles requests to the /apps/validate endpoint
type ValidatePorterAppHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewValidatePorterAppHandler returns a new ValidatePorterAppHandler
func NewValidatePorterAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ValidatePorterAppHandler {
	return &ValidatePorterAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// Deletions are the names of services and env variables to delete
type Deletions struct {
	ServiceNames     []string `json:"service_names"`
	EnvVariableNames []string `json:"env_variable_names"`
	EnvGroupNames    []string `json:"env_group_names"`
}

// ValidatePorterAppRequest is the request object for the /apps/validate endpoint
type ValidatePorterAppRequest struct {
	AppName            string    `json:"app_name"`
	Base64AppProto     string    `json:"b64_app_proto"`
	DeploymentTargetId string    `json:"deployment_target_id"`
	CommitSHA          string    `json:"commit_sha"`
	Deletions          Deletions `json:"deletions"`
}

// ValidatePorterAppResponse is the response object for the /apps/validate endpoint
type ValidatePorterAppResponse struct {
	ValidatedBase64AppProto string `json:"validate_b64_app_proto"`
}

// ServeHTTP translates requests into protobuf objects and forwards them to the cluster control plane, returning the result
func (c *ValidatePorterAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-validate-porter-app")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	request := &ValidatePorterAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appProto := &porterv1.PorterApp{}

	if request.Base64AppProto == "" {
		if request.AppName == "" {
			err := telemetry.Error(ctx, span, nil, "app name is empty and no base64 proto provided")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		appProto.Name = request.AppName
	} else {
		decoded, err := base64.StdEncoding.DecodeString(request.Base64AppProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error decoding base  yaml")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		err = helpers.UnmarshalContractObject(decoded, appProto)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error unmarshalling app proto")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
	}

	if appProto.Name == "" {
		err := telemetry.Error(ctx, span, nil, "app proto name is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-name", Value: appProto.Name},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetId},
		telemetry.AttributeKV{Key: "commit-sha", Value: request.CommitSHA},
	)

	validateReq := connect.NewRequest(&porterv1.ValidatePorterAppRequest{
		ProjectId:          int64(project.ID),
		DeploymentTargetId: request.DeploymentTargetId,
		CommitSha:          request.CommitSHA,
		App:                appProto,
		Deletions: &porterv1.Deletions{
			ServiceNames:     request.Deletions.ServiceNames,
			EnvVariableNames: request.Deletions.EnvVariableNames,
			EnvGroupNames:    request.Deletions.EnvGroupNames,
		},
	})
	ccpResp, err := c.Config().ClusterControlPlaneClient.ValidatePorterApp(ctx, validateReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp validate porter app")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp msg is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp.Msg.App == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp app is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	encoded, err := helpers.MarshalContractObject(ctx, ccpResp.Msg.App)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error marshalling app proto back to json")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	b64 := base64.StdEncoding.EncodeToString(encoded)

	response := &ValidatePorterAppResponse{
		ValidatedBase64AppProto: b64,
	}

	c.WriteResult(w, r, response)
}
