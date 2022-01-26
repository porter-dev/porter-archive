package infra

// import (
// 	"fmt"
// 	"net/http"

// 	"github.com/porter-dev/porter/api/server/handlers"
// 	"github.com/porter-dev/porter/api/server/shared"
// 	"github.com/porter-dev/porter/api/server/shared/config"
// 	"github.com/porter-dev/porter/api/server/shared/websocket"
// 	"github.com/porter-dev/porter/api/types"
// 	"github.com/porter-dev/porter/internal/models"
// )

// type InfraStreamLogsHandler struct {
// 	handlers.PorterHandlerWriter
// }

// func NewInfraStreamLogsHandler(
// 	config *config.Config,
// 	writer shared.ResultWriter,
// ) *InfraStreamLogsHandler {
// 	return &InfraStreamLogsHandler{
// 		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
// 	}
// }

// func (c *InfraStreamLogsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
// 	safeRW := r.Context().Value(types.RequestCtxWebsocketKey).(*websocket.WebsocketSafeReadWriter)
// 	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

// 	fmt.Println(safeRW, infra)
// }
