package porter_app_v2

import (
	"encoding/base64"
	"fmt"
	"net/http"

	"github.com/porter-dev/api-contracts/generated/go/helpers"

	"github.com/porter-dev/porter/internal/porter_app"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ParsePorterYAMLToProtoHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewParsePorterYAMLToProtoHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ParsePorterYAMLToProtoHandler {
	return &ParsePorterYAMLToProtoHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

type ParsePorterYAMLToProtoRequest struct {
	Base64Yaml string `json:"b64_yaml"`
}

type ParsePorterYAMLToProtoResponse struct {
	Base64AppProto string `json:"b64_app_proto"`
}

func (c *ParsePorterYAMLToProtoHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-porter-app")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	fmt.Println("1")

	if !project.ValidateApplyV2 {
		err := telemetry.Error(ctx, span, nil, "project does not have apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	fmt.Println("2")

	request := &ParsePorterYAMLToProtoRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	fmt.Println("3")

	if request == nil {
		err := telemetry.Error(ctx, span, nil, "request is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	fmt.Println("4")

	if request.Base64Yaml == "" {
		err := telemetry.Error(ctx, span, nil, "b64_yaml is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	fmt.Println("5")

	yaml, err := base64.StdEncoding.DecodeString(request.Base64Yaml)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error decoding b64_yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if yaml == nil {
		err := telemetry.Error(ctx, span, nil, "decoded yaml is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	fmt.Println("6")

	appProto, err := porter_app.ParseYAML(ctx, yaml)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if appProto == nil {
		err := telemetry.Error(ctx, span, nil, "app_proto is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	fmt.Println("7")

	by, err := helpers.MarshalContractObject(ctx, appProto)
	if err != nil {
		err := telemetry.Error(ctx, span, nil, "error marshalling app proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	b64 := base64.StdEncoding.EncodeToString(by)

	response := &ParsePorterYAMLToProtoResponse{
		Base64AppProto: b64,
	}

	c.WriteResult(w, r, response)
}
