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

type CreateGCPHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateGCPHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateGCPHandler {
	return &CreateGCPHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreateGCPHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateGCPRequest{}

	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	gcp := CreateGCPIntegration(request, project.ID, user.ID)

	gcp, err := p.Repo().GCPIntegration().CreateGCPIntegration(gcp)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := types.CreateGCPResponse{
		GCPIntegration: gcp.ToGCPIntegrationType(),
	}

	p.WriteResult(w, r, res)
}

func CreateGCPIntegration(request *types.CreateGCPRequest, projectID, userID uint) *ints.GCPIntegration {
	resp := &ints.GCPIntegration{
		UserID:       userID,
		ProjectID:    projectID,
		GCPKeyData:   []byte(request.GCPKeyData),
		GCPProjectID: request.GCPProjectID,
		GCPRegion:    request.GCPRegion,
	}

	resp.PopulateGCPMetadata()

	return resp
}
