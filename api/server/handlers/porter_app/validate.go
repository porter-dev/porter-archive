package porter_app

import (
	"encoding/base64"
	"net/http"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/porter_app/conversion"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type ValidatePorterAppRequest struct {
	DeploymentTargetID uint   `json:"deployment_target_id"`
	AppName            string `json:"app_name"`
	PorterYAMLBase64   string `json:"porter_yaml"`
	LatestCommit       string `json:"latest_commit"`
}

type ValidatePorterAppHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewValidatePorterAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ValidatePorterAppHandler {
	return &ValidatePorterAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ValidatePorterAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-validate-porter-app")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "project-id", Value: project.ID})
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID})

	// read the request body
	request := &ValidatePorterAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	porterYamlBase64 := request.PorterYAMLBase64
	porterYaml, err := base64.StdEncoding.DecodeString(porterYamlBase64)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error decoding porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// validate the porter yaml
	apps, err := conversion.AppProtoFromYaml(porterYaml)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error extracting apps from porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	target, ok := apps[request.AppName]
	if !ok {
		err = telemetry.Error(ctx, span, err, "app name not found in porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// validate the app
	validateRequest := connect.NewRequest(&porterv1.ValidatePorterAppRequest{
		ProjectId:          int64(project.ID),
		DeploymentTargetId: int64(request.DeploymentTargetID),
		Application:        target,
	})

	validation, err := c.Config().ClusterControlPlaneClient.ValidatePorterApp(ctx, validateRequest)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error sending contract for update")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	w.WriteHeader(http.StatusOK)
	c.WriteResult(w, r, validation.Msg)
}
