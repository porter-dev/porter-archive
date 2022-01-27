package state

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"
)

type DeleteResourceHandler struct {
	Config           *config.Config
	decoderValidator shared.RequestDecoderValidator
}

func NewDeleteResourceHandler(
	config *config.Config,
) *DeleteResourceHandler {
	return &DeleteResourceHandler{
		Config:           config,
		decoderValidator: shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
	}
}

func (c *DeleteResourceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)

	fmt.Println("destroying", infra.ID, operation.UID)
}
