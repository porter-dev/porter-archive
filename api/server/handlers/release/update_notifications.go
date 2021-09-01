package release

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type UpdateNotificationHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUpdateNotificationHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateNotificationHandler {
	return &UpdateNotificationHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *UpdateNotificationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	name, _ := requestutils.GetURLParamString(r, types.URLParamReleaseName)
	namespace := r.Context().Value(types.NamespaceScope).(string)

	request := &types.UpdateNotificationConfigRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	release, err := c.Repo().Release().ReadRelease(cluster.ID, name, namespace)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	}

	// either create a new notification config or update the current one
	newConfig := &models.NotificationConfig{
		Enabled: request.Payload.Enabled,
		Success: request.Payload.Success,
		Failure: request.Payload.Failure,
	}

	if release.NotificationConfig == 0 {
		newConfig, err = c.Repo().NotificationConfig().CreateNotificationConfig(newConfig)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		release.NotificationConfig = newConfig.ID

		release, err = c.Repo().Release().UpdateRelease(release)
	} else {
		newConfig.ID = release.NotificationConfig
		newConfig, err = c.Repo().NotificationConfig().UpdateNotificationConfig(newConfig)
	}

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
