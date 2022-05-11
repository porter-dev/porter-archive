package project_integration

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

type CreateAzureHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateAzureHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateAzureHandler {
	return &CreateAzureHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreateAzureHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateAzureRequest{}

	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	az := CreateAzureIntegration(request, project.ID, user.ID)

	az, err := p.Repo().AzureIntegration().CreateAzureIntegration(az)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := types.CreateAzureResponse{
		AzureIntegration: az.ToAzureIntegrationType(),
	}

	p.WriteResult(w, r, res)
}

func CreateAzureIntegration(request *types.CreateAzureRequest, projectID, userID uint) *ints.AzureIntegration {
	resp := &ints.AzureIntegration{
		UserID:                 userID,
		ProjectID:              projectID,
		AzureClientID:          request.AzureClientID,
		AzureSubscriptionID:    request.AzureSubscriptionID,
		AzureTenantID:          request.AzureTenantID,
		ServicePrincipalSecret: []byte(request.ServicePrincipalKey),
	}

	return resp
}
