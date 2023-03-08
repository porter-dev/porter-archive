package project

import (
	"fmt"
	"io"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type CreateClusterHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProvisionClusterHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateClusterHandler {
	return &CreateClusterHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// TODO: implement
func (c *CreateClusterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	bytes, err := io.ReadAll(r.Body)
	if err != nil {
		return
	}
	fmt.Println("Provisioning attempt received:")
	fmt.Println(string(bytes))
}
