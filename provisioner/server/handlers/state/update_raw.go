package state

import (
	"io"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"

	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type RawStateUpdateHandler struct {
	Config *config.Config
}

func NewRawStateUpdateHandler(
	config *config.Config,
) *RawStateUpdateHandler {
	return &RawStateUpdateHandler{
		Config: config,
	}
}

func (c *RawStateUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	// read state file
	fileBytes, err := io.ReadAll(r.Body)
	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)

		return
	}

	err = c.Config.StorageManager.WriteFile(infra, ptypes.DefaultTerraformStateFile, fileBytes, true)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)

		return
	}

	return
}
