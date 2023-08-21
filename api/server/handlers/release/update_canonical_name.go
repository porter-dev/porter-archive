package release

import (
	"errors"
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
	"github.com/stefanmcshane/helm/pkg/release"
	"gorm.io/gorm"
	"k8s.io/apimachinery/pkg/util/validation"
)

type UpdateCanonicalNameHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdateCanonicalNameHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateCanonicalNameHandler {
	return &UpdateCanonicalNameHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *UpdateCanonicalNameHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "change-canonical-name")
	defer span.End()

	name, _ := requestutils.GetURLParamString(r, types.URLParamReleaseName)
	// namespace, _ := requestutils.GetURLParamString(r, types.URLParamNamespace)

	helmRelease, _ := ctx.Value(types.ReleaseScope).(*release.Release)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "release-name", Value: helmRelease.Name})

	request := &types.UpdateCanonicalNameRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	release, err := c.Repo().Release().ReadRelease(cluster.ID, helmRelease.Name, helmRelease.Namespace)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			telemetry.Error(ctx, span, err, "unable to get release")
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("release %s not found", name)))
			return
		}

		err = telemetry.Error(ctx, span, err, "unable to get release resource")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if release.CanonicalName != request.CanonicalName {
		if request.CanonicalName != "" {
			if errStrs := validation.IsDNS1123Label(request.CanonicalName); len(errStrs) > 0 {
				telemetry.Error(ctx, span, err, "canonical name is incorrect")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("invalid canonical name"), http.StatusBadRequest))
				return
			}
		}

		release.CanonicalName = request.CanonicalName

		release, err = c.Repo().Release().UpdateRelease(release)

		if err != nil {
			err = telemetry.Error(ctx, span, err, "error updating chart")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	c.WriteResult(w, r, release.ToReleaseType())
}
