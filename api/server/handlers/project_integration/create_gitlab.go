package project_integration

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

type CreateGitlabIntegration struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateGitlabIntegration(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateGitlabIntegration {
	return &CreateGitlabIntegration{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreateGitlabIntegration) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	metadata := p.Config().Metadata

	if !metadata.Gitlab {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("gitlab integration endpoints are not enabled")))
		return
	}

	request := &types.CreateGitlabRequest{}

	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	_, err := url.Parse(request.InstanceURL)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("malformed gitlab instance URL"), http.StatusBadRequest,
		))
		return
	}

	gitlabIntegration, err := p.Repo().GitlabIntegration().CreateGitlabIntegration(&ints.GitlabIntegration{
		ProjectID:       project.ID,
		InstanceURL:     request.InstanceURL,
		AppClientID:     []byte(request.AppClientID),
		AppClientSecret: []byte(request.AppClientSecret),
	})

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := types.CreateGitlabResponse{
		GitlabIntegration: gitlabIntegration.ToGitlabIntegrationType(),
	}

	p.WriteResult(w, r, res)
}
