package state

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/server/config"
	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type CreateResourceHandler struct {
	Config           *config.Config
	decoderValidator shared.RequestDecoderValidator
}

func NewCreateResourceHandler(
	config *config.Config,
) *CreateResourceHandler {
	return &CreateResourceHandler{
		Config: config,
	}
}

func (c *CreateResourceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	req := &ptypes.CreateResourceRequest{}

	if ok := c.decoderValidator.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// TODO: switch on the kind of resource
	fmt.Println("got the following:", infra.ID, req.Kind, req.Output)
}
