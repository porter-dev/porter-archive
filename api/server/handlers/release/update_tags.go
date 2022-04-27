package release

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
)

type UpdateReleaseTagsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdateReleaseTagsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateReleaseTagsHandler {
	return &UpdateReleaseTagsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *UpdateReleaseTagsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	name, _ := requestutils.GetURLParamString(r, types.URLParamReleaseName)
	namespace, _ := requestutils.GetURLParamString(r, types.URLParamNamespace)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	fmt.Println("FIRST CHECKPOINT")
	request := &types.PatchUpdateReleaseTags{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}
	fmt.Println("SECOND CHECKPOINT")
	fmt.Println(cluster.ID)
	fmt.Println(name)
	fmt.Println(namespace)
	release, err := c.Config().Repo.Release().ReadRelease(cluster.ID, name, namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	fmt.Println("THIRD CHECKPOINT")
	release, err = LinkTagsToRelease(c.Config(), request.Tags, release)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	fmt.Println("FOURTH CHECKPOINT")
	w.WriteHeader(http.StatusCreated)
	c.WriteResult(w, r, release)
}
