package porter_app

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type RollbackPorterAppHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewRollbackPorterAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RollbackPorterAppHandler {
	return &RollbackPorterAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *RollbackPorterAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-rollback-porter-app")
	defer span.End()
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &types.RollbackPorterAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	stackName, reqErr := requestutils.GetURLParamString(r, types.URLParamStackName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error getting stack name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "stack-name", Value: stackName})
	namespace := fmt.Sprintf("porter-stack-%s", stackName)

	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting helm agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	helmRelease, err := helmAgent.GetRelease(ctx, stackName, 0, false)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting helm release")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	imageInfo := attemptToGetImageInfoFromRelease(helmRelease.Config)
	if imageInfo.Tag == "" {
		imageInfo.Tag = "latest"
	}

	porterApp, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting porter app")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	err = helmAgent.RollbackRelease(ctx, helmRelease.Name, request.Revision)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error rolling back release")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	_, err = createPorterAppEvent(ctx, "SUCCESS", porterApp.ID, helmRelease.Version+1, imageInfo.Tag, c.Repo().PorterAppEvent())
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating porter app event")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
}
