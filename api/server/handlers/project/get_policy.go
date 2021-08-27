package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectGetPolicyHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectGetPolicyHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ProjectGetPolicyHandler {
	return &ProjectGetPolicyHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectGetPolicyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	policyDocLoader := policy.NewBasicPolicyDocumentLoader(p.Config().Repo.Project())

	policyDocs, err := policyDocLoader.LoadPolicyDocuments(user.ID, proj.ID)

	if err != nil {
		p.HandleAPIError(r.Context(), w, apierrors.NewErrInternal(err))
	}

	var res types.GetProjectPolicyResponse = policyDocs

	p.WriteResult(r.Context(), w, res)
}
