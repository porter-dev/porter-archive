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
	name, _ := requestutils.GetURLParamString(r, types.URLParamReleaseName)
	namespace, _ := requestutils.GetURLParamString(r, types.URLParamNamespace)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.UpdateCanonicalNameRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	release, err := c.Repo().Release().ReadRelease(cluster.ID, name, namespace)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("release %s not found", name)))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if release.CanonicalName != request.CanonicalName {
		if request.CanonicalName != "" {
			if errStrs := validation.IsDNS1123Label(request.CanonicalName); len(errStrs) > 0 {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("invalid canonical name"), http.StatusBadRequest))
				return
			}
		}

		release.CanonicalName = request.CanonicalName

		release, err = c.Repo().Release().UpdateRelease(release)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	c.WriteResult(w, r, release.ToReleaseType())
}
