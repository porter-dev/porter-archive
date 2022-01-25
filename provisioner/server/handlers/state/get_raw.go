package state

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"
)

const DefaultTerraformStateFile = "default.tfstate"

type RawStateGetHandler struct {
	Config *config.Config
}

func NewRawStateGetHandler(
	config *config.Config,
) *RawStateGetHandler {
	return &RawStateGetHandler{
		Config: config,
	}
}

func (c *RawStateGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	fileBytes, err := c.Config.StorageManager.ReadFile(infra, DefaultTerraformStateFile)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)

		return
	}

	if _, err = w.Write(fileBytes); err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)

		return
	}
}
