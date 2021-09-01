package release

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"helm.sh/helm/v3/pkg/release"
)

type CreateWebhookHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateWebhookHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *CreateWebhookHandler {
	return &CreateWebhookHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *CreateWebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	name, _ := requestutils.GetURLParamString(r, types.URLParamReleaseName)
	namespace := r.Context().Value(types.NamespaceScope).(string)

	token, err := repository.GenerateRandomBytes(16)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create release with webhook token in db
	image, ok := helmRelease.Config["image"].(map[string]interface{})

	if !ok {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("Could not find field image in config")))
		return
	}

	repository := image["repository"]
	repoStr, ok := repository.(string)

	if !ok {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("Could not find field repository in config")))
		return
	}

	release := &models.Release{
		ClusterID:    cluster.ID,
		ProjectID:    cluster.ProjectID,
		Namespace:    namespace,
		Name:         name,
		WebhookToken: token,
		ImageRepoURI: repoStr,
	}

	release, err = c.Repo().Release().CreateRelease(release)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, release.ToReleaseType())
}
