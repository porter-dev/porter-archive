package metadata

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type MetadataGetHandler struct {
	handlers.PorterHandlerWriter
}

func NewMetadataGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *MetadataGetHandler {
	return &MetadataGetHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (v *MetadataGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	v.WriteResult(r.Context(), w, v.Config().Metadata)
}
