package project_integration

import (
	"fmt"
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

// ListAWSAssumeRoleLink summarises the responses for AWS assume role chain links.
// This is only intended for CAPI projects
type ListAWSAssumeRoleLink struct {
	// ID is the ID of the assume role chain in the db. UUID as a string
	ID string `json:"id"`
	// ARN is the target ARN in an AWS assume role chain
	ARN string `json:"aws_arn"`
	// ProjectID is the projec that this link belongs to
	ProjectID int `json:"project_id"`
}

func (p *ListAWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if project.CapiProvisionerEnabled {
		dblinks, err := p.Repo().AWSAssumeRoleChainer().List(ctx, project.ID)
		if err != nil {
			e := fmt.Errorf("unable to find assume role chain links: %w", err)
			p.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}

		var links []ListAWSAssumeRoleLink
		for _, link := range dblinks {
			links = append(links, ListAWSAssumeRoleLink{
				ID:        link.ID.String(),
				ARN:       link.TargetARN,
				ProjectID: link.ProjectID,
			})
		}
		p.WriteResult(w, r, links)
		w.WriteHeader(http.StatusOK)
		return
	}

	awsInts, err := p.Repo().AWSIntegration().ListAWSIntegrationsByProjectID(project.ID)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListAWSResponse = make([]*types.AWSIntegration, 0)
	for _, awsInt := range awsInts {
		res = append(res, awsInt.ToAWSIntegrationType())
	}

	if len(awsInts) == 0 {
		// so that the datatype stays the same on all returns
		p.WriteResult(w, r, []*types.AWSIntegration{})
		return
	}

	p.WriteResult(w, r, res)
}
