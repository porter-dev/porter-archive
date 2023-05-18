package project_integration

import (
	"fmt"
	"net/http"

	ints "github.com/porter-dev/porter/internal/models/integrations"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type DeleteGitlabIntegration struct {
	handlers.PorterHandlerReadWriter
}

func NewDeleteGitlabIntegrationHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *DeleteGitlabIntegration {
	return &DeleteGitlabIntegration{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *DeleteGitlabIntegration) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Println("I'm running!")

	gi, _ := r.Context().Value(types.GitlabIntegrationScope).(*ints.GitlabIntegration)

	metadata := p.Config().Metadata

	if !metadata.Gitlab {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("gitlab integration endpoints are not enabled")))
		return
	}

	err := p.Repo().GitlabIntegration().DeleteGitlabIntegrationByID(gi.ProjectID, gi.ID)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	return
}
