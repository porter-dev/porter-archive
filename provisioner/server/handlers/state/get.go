package state

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/provisioner/server/config"
)

type StateGetHandler struct {
	Config *config.Config
}

func NewStateGetHandler(
	config *config.Config,
) *StateGetHandler {
	return &StateGetHandler{
		Config: config,
	}
}

func (c *StateGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// TODO: read the state from the state storage interface
	fmt.Println("GET state handler called")
}
