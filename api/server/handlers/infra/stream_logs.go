package infra

import (
	"context"
	"errors"
	"io"
	"net/http"
	"sync"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/pb"
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

	ctx, cancel := c.Config().ProvisionerClient.NewGRPCContext(workspaceID)

	defer cancel()

	stream, err := c.Config().ProvisionerClient.GRPCClient.GetLog(ctx, &pb.Infra{
		ProjectId: int64(infra.ProjectID),
		Id:        int64(infra.ID),
		Suffix:    infra.Suffix,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	errorchan := make(chan error)

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		wg.Wait()
		close(errorchan)
	}()

	go func() {
		defer wg.Done()

		for {
			if _, _, err := safeRW.ReadMessage(); err != nil {
				errorchan <- nil
				return
			}
		}
	}()

	go func() {
		defer wg.Done()

		for {
			tfLog, err := stream.Recv()

			if err != nil {
				if err == io.EOF || errors.Is(ctx.Err(), context.Canceled) {
					errorchan <- nil
				} else {
					errorchan <- err
				}

				return
			}

			_, err = safeRW.Write([]byte(tfLog.Log))

			if err != nil {
				errorchan <- nil
				return
			}
		}

	}()

	for err = range errorchan {
		if err != nil {
			c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
		}

		// close the grpc stream: do not check for error case since the stream could already be
		// closed
		stream.CloseSend()

		// close the websocket stream: do not check for error case since the WS could already be
		// closed
		safeRW.Close()

		// cancel the context set for the grpc stream to ensure that Recv is unblocked
		cancel()
	}
}
