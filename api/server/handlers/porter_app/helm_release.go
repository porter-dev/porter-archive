package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	utils "github.com/porter-dev/porter/api/utils/porter_app"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type PorterAppHelmReleaseGetHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewPorterAppHelmReleaseGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *PorterAppHelmReleaseGetHandler {
	return &PorterAppHelmReleaseGetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *PorterAppHelmReleaseGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	ctx, span := telemetry.NewSpan(ctx, "serve-get-porter-app-helm-release")
	defer span.End()

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error getting stack name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	version, reqErr := requestutils.GetURLParamUint(r, types.URLParamReleaseVersion)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error getting version from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "version", Value: version})

	namespace := utils.NamespaceFromPorterAppName(appName)
	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting helm agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	release, err := helmAgent.GetRelease(ctx, appName, int(version), false)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting helm release")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	res := &types.Release{
		Release: release,
	}

	c.WriteResult(w, r, res)
}
