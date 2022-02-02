package infra

import (
	"context"
	"io"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/pb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

type InfraStreamLogHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraStreamLogHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraStreamLogHandler {
	return &InfraStreamLogHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraStreamLogHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	safeRW := r.Context().Value(types.RequestCtxWebsocketKey).(*websocket.WebsocketSafeReadWriter)
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)
	workspaceID := models.GetWorkspaceID(infra, operation)

	conn, err := grpc.Dial("localhost:8082", grpc.WithInsecure())

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	client := pb.NewProvisionerClient(conn)

	ctx, _ := context.WithCancel(context.Background())

	header := metadata.New(map[string]string{
		"workspace_id": workspaceID,
	})

	ctx = metadata.NewOutgoingContext(ctx, header)

	stream, err := client.GetLog(ctx, &pb.Infra{
		ProjectId: int64(infra.ProjectID),
		Id:        int64(infra.ID),
		Suffix:    infra.Suffix,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// TODO: CANCEL BASED ON REQUEST
	for {
		tfLog, err := stream.Recv()

		if err == io.EOF {
			break
		}

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		safeRW.Write([]byte(tfLog.Log))
	}
}
