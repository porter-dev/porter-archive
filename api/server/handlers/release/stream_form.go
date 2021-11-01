package release

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/websocket"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/templater/parser"
	"helm.sh/helm/v3/pkg/release"
)

type StreamFormHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewStreamFormHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StreamFormHandler {
	return &StreamFormHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func onData(val map[string]interface{}) error {
	fmt.Println("VAL IS", val)
	return nil
}

func (c *StreamFormHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	safeRW := r.Context().Value(types.RequestCtxWebsocketKey).(*websocket.WebsocketSafeReadWriter)

	request := &types.StreamCRDRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// look for the form using the dynamic client
	dynClient, err := c.GetDynamicClient(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	parserDef := &parser.ClientConfigDefault{
		DynamicClient: dynClient,
		HelmChart:     helmRelease.Chart,
		HelmRelease:   helmRelease,
	}

	formData := []byte(certManagerForm)

	// TODO: move this back
	// var formData []byte

	// for _, file := range helmRelease.Chart.Files {
	// 	if strings.Contains(file.Name, "form.yaml") {
	// 		formData = file.Data
	// 		break
	// 	}
	// }

	stopper := make(chan struct{})
	errorchan := make(chan error)
	defer close(stopper)

	go func() {
		// listens for websocket closing handshake
		for {
			if _, _, err := safeRW.ReadMessage(); err != nil {
				errorchan <- nil
				return
			}
		}
	}()

	err = parser.FormStreamer(parserDef, formData, "", &types.FormContext{
		Type: "cluster",
		Config: map[string]string{
			"group":    request.Group,
			"resource": request.Resource,
			"version":  request.Version,
		},
	}, onData, stopper)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	for {
		select {
		case err := <-errorchan:
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
