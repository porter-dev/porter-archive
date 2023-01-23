package saml

import (
	"errors"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type CreateSAMLIntegrationHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateSAMLIntegrationHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateSAMLIntegrationHandler {
	return &CreateSAMLIntegrationHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (h *CreateSAMLIntegrationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	if !project.SAMLSSOEnabled {
		h.HandleAPIError(w, r, apierrors.NewErrForbidden(errors.New("SAML SSO is not enabled for this project")))
		return
	}

	// FIXME: check if user has necessary permissions to make this request with RBAC

}
