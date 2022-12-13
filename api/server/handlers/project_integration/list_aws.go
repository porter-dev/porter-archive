package project_integration

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ListAWSHandler struct {
	handlers.PorterHandlerWriter
}

func NewListAWSHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListAWSHandler {
	return &ListAWSHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ListAWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	awsInts, err := p.Repo().AWSIntegration().ListAWSIntegrationsByProjectID(project.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListAWSResponse = make([]*types.AWSIntegration, 0)

	for _, awsInt := range awsInts {
		aint := awsInt.ToAWSIntegrationType()
		res = append(res, &aint)
	}

	p.WriteResult(w, r, res)
}
