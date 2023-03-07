//go:build !ee
// +build !ee

package credentials

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/provisioner/server/config"

	"github.com/porter-dev/porter/api/types"
)

type GetCredentialsHandler struct {
	config *config.Config
}

func NewCredentialsGetHandler(
	config *config.Config,
) http.Handler {
	return &GetCredentialsHandler{config}
}

func (u *GetCredentialsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	apierrors.HandleAPIError(u.config.Logger, u.config.Alerter, w, r, apierrors.NewErrPassThroughToClient(
		fmt.Errorf("get_credentials not available in community edition"),
		http.StatusBadRequest,
	), true, apierrors.ErrorOpts{
		Code: types.ErrCodeUnavailable,
	})
}
