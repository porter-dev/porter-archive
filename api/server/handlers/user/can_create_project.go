package user

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type CanCreateProject struct {
	handlers.PorterHandlerWriter
}

func NewCanCreateProjectHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CanCreateProject {
	return &CanCreateProject{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CanCreateProject) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if c.Config().ServerConf.DisableAllowlist {
		c.WriteResult(w, r, "")
		return
	}

	user, _ := r.Context().Value(types.UserScope).(*models.User)

	exists, err := c.Repo().Allowlist().UserEmailExists(user.Email)
	if err != nil {
		err = fmt.Errorf("couldn't retrieve user: %s", err.Error())
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if !exists {
		err = fmt.Errorf("user is not authorized")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, 403))
		return
	}

	c.WriteResult(w, r, "")
}
