package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
)

type ProjectCreateHandler struct {
	config *shared.Config

	endpoint *shared.APIEndpoint
}

func NewProjectCreateHandler(config *shared.Config, endpoint *shared.APIEndpoint) *ProjectCreateHandler {
	return &ProjectCreateHandler{config, endpoint}
}

func (p *ProjectCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// request := &types.CreateProjectRequest{}

	// ok := p.endpoint.Reader(r.Body, request)

	// if !ok {
	// 	return
	// }
}
