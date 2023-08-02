package porter_app

import (
	"encoding/base64"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/porter_app/validate"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type ValidatePorterAppRequest struct {
	PorterYAMLBase64 string `json:"porter_yaml"`
	LatestCommit     string `json:"latest_commit"`
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

	fmt.Println(request)

	porterYamlBase64 := request.PorterYAMLBase64
	porterYaml, err := base64.StdEncoding.DecodeString(porterYamlBase64)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error decoding porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// validate the porter yaml
	apps, err := validate.ValidatePorterYAML(porterYaml, c.Repo().Revision())
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error validating porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	c.WriteResult(w, r, apps)
}
