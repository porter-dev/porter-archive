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

type CreateBasicHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateBasicHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateBasicHandler {
	return &CreateBasicHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreateBasicHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateBasicRequest{}

	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	basic := CreateBasicIntegration(request.Username, request.Password, project.ID, user.ID)

	basic, err := p.Repo().BasicIntegration().CreateBasicIntegration(basic)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := types.CreateBasicResponse{
		BasicIntegration: basic.ToBasicIntegrationType(),
	}

	p.WriteResult(w, r, res)
}

func CreateBasicIntegration(username, password string, projectID, userID uint) *ints.BasicIntegration {
	return &ints.BasicIntegration{
		UserID:    userID,
		ProjectID: projectID,
		Username:  []byte(username),
		Password:  []byte(password),
	}
}
