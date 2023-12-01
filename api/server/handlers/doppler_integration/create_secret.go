package doppler

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type CreateDopplerSecretHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateDopplerSecretHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateDopplerSecretHandler {
	return &CreateDopplerSecretHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

type CreateDopplerSecretHandlerRequest struct {
	// Name of the env group to create or update
	Name string `json:"name"`

	// Doppler ServiceToken. Assigned per environment on Doppler.
	ServiceToken string `json:"service_token"`
}

type CreateDopplerSecretHandlerResponse struct {
	// Name of the env group to create or update
	Name string `json:"name"`
}

func (c *CreateDopplerSecretHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-doppler-secret")
	defer span.End()

	request := &CreateDopplerSecretHandlerRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "doppler-group-name", Value: request.Name},
	)

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to connect to kubernetes cluster")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	data := map[string]string{
		"serviceToken": request.ServiceToken,
	}

	secretData := EncodeSecrets(data)

	// create secret first
	if _, err := agent.CreateSecret(request.Name, "default", secretData); err != nil {

		err := telemetry.Error(ctx, span, err, "unable to create secret")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// Install Doppler CRD

	dopplerSecretResponse := &CreateDopplerSecretHandlerResponse{
		Name: request.Name,
	}
	c.WriteResult(w, r, dopplerSecretResponse)
}

func EncodeSecrets(data map[string]string) map[string][]byte {
	res := make(map[string][]byte)

	for key, rawValue := range data {
		res[key] = []byte(rawValue)
	}

	return res
}
