package project

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
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
	ctx, span := telemetry.NewSpan(r.Context(), "delete-project")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)
	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if proj.GetFeatureFlag(models.CapiProvisionerEnabled, p.Config().LaunchDarklyClient) {
		clusters, err := p.Config().Repo.Cluster().ListClustersByProjectID(proj.ID)
		if err != nil {
			e := "error finding clusters for project"
			err = telemetry.Error(ctx, span, err, e)
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		for _, cluster := range clusters {
			if cluster.ProvisionedBy == "CAPI" {
				if !cluster.DeletedAt.Time.IsZero() {
					continue
				}

				if cluster.CloudProvider == "Hosted" {
					req := connect.NewRequest(&porterv1.DeletePorterCloudClusterRequest{
						ClusterId: int64(cluster.ID),
						ProjectId: int64(cluster.ProjectID),
					})

					_, err = p.Config().ClusterControlPlaneClient.DeletePorterCloudCluster(ctx, req)
					if err != nil {
						e := "error deleting cluster"
						err = telemetry.Error(ctx, span, err, e)
						p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
						return
					}

					// technically multiple clusters shouldn't exist in a porter cloud project.
					continue
				}

				contractRevision, err := p.Config().Repo.APIContractRevisioner().List(ctx, proj.ID, repository.WithClusterID(cluster.ID))
				if err != nil {
					e := "error finding contract revisions for cluster"
					err = telemetry.Error(ctx, span, err, e)
					p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
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
					e := "error deleting cluster"
					err = telemetry.Error(ctx, span, err, e)
					p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
					return
				}
			}
		}
	}
	err := p.Config().UserNotifier.SendProjectDeleteEmail(
		&notifier.SendProjectDeleteEmailOpts{
			Email:   user.Email,
			Project: proj.Name,
		},
	)
	if err != nil {
		e := "error sending project deletion email"
		err = telemetry.Error(ctx, span, err, e)
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if p.Config().BillingManager.LagoConfigLoaded && proj.GetFeatureFlag(models.LagoEnabled, p.Config().LaunchDarklyClient) {
		err = p.Config().BillingManager.LagoClient.DeleteCustomer(ctx, proj.ID, proj.EnableSandbox)
		if err != nil {
			e := "error ending billing plan"
			err = telemetry.Error(ctx, span, err, e)
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	if p.Config().BillingManager.StripeConfigLoaded && proj.GetFeatureFlag(models.BillingEnabled, p.Config().LaunchDarklyClient) {
		err = p.Config().BillingManager.StripeClient.DeleteCustomer(ctx, proj.BillingID)
		if err != nil {
			e := "error deleting stripe customer"
			err = telemetry.Error(ctx, span, err, e)
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	deletedProject, err := p.Repo().Project().DeleteProject(proj)
	if err != nil {
		e := "error deleting project"
		err = telemetry.Error(ctx, span, err, e)
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	err = p.Repo().AWSAssumeRoleChainer().Delete(ctx, proj.ID)
	if err != nil {
		e := "error deleting assume role chain"
		err = telemetry.Error(ctx, span, err, e)
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	err = p.Repo().Project().DeleteRolesForProject(proj.ID)
	if err != nil {
		e := "error deleting roles for project"
		err = telemetry.Error(ctx, span, err, e)
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	p.WriteResult(w, r, deletedProject.ToProjectType(p.Config().LaunchDarklyClient))
}
