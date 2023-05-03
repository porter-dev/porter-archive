package project

import (
	"fmt"
	"net/http"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectDeleteHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectDeleteHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ProjectDeleteHandler {
	return &ProjectDeleteHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user, _ := ctx.Value(types.UserScope).(*models.User)
	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if proj.CapiProvisionerEnabled {
		clusters, err := p.Config().Repo.Cluster().ListClustersByProjectID(proj.ID)
		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error finding clusters for project: %w", err)))
			return
		}

		for _, cluster := range clusters {
			if cluster.ProvisionedBy == "CAPI" {
				if !cluster.DeletedAt.Time.IsZero() {
					continue
				}

				contractRevision, err := p.Config().Repo.APIContractRevisioner().List(ctx, proj.ID, cluster.ID)
				if err != nil {
					p.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error finding contract revisions for cluster: %w", err)))
					return
				}
				if len(contractRevision) == 0 {
					continue
				}

				req := connect.NewRequest(&porterv1.DeleteClusterRequest{
					ContractRevision: &porterv1.ContractRevision{
						ClusterId:  int32(cluster.ID),
						ProjectId:  int32(cluster.ProjectID),
						RevisionId: contractRevision[0].ID.String(),
					},
				})
				_, err = p.Config().ClusterControlPlaneClient.DeleteCluster(ctx, req)
				if err != nil {
					p.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting cluster: %w", err)))
					return
				}
			}
		}
	}

	deletedProject, err := p.Repo().Project().DeleteProject(proj)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, deletedProject.ToProjectType())

	// delete the billing team
	if err := p.Config().BillingManager.DeleteTeam(user, proj); err != nil {
		// we do not write error response, since setting up billing error can be
		// resolved later and may not be fatal
		p.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
	}
}
