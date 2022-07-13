package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectGetBillingHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectGetBillingHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ProjectGetBillingHandler {
	return &ProjectGetBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectGetBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	res := &types.GetProjectBillingResponse{
		HasBilling: false,
	}

	if sc := p.Config().ServerConf; sc.BillingPrivateKey != "" && sc.BillingPrivateServerURL != "" {
		// determine if the project has usage attached; if so, set has_billing to true
		usage, _ := p.Repo().ProjectUsage().ReadProjectUsage(proj.ID)

		res.HasBilling = usage != nil
	}

	p.WriteResult(w, r, res)
}
