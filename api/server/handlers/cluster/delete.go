package cluster

import (
	"fmt"
	"net/http"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ClusterDeleteHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewClusterDeleteHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ClusterDeleteHandler {
	return &ClusterDeleteHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ClusterDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if cluster.ProvisionedBy == "CAPI" {
		if !c.Config().DisableCAPIProvisioner {
			revisions, err := c.Config().Repo.APIContractRevisioner().List(ctx, cluster.ProjectID, cluster.ID)
			if err != nil {
				e := fmt.Errorf("error listing revisions for cluster %d: %w", cluster.ID, err)
				c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
				return
			}
			var revisionID string
			for _, rev := range revisions {
				if rev.Condition == "SUCCESS" {
					revisionID = rev.ID.String()
					break
				}
			}
			cl := connect.NewRequest(&porterv1.DeleteClusterRequest{
				ContractRevision: &porterv1.ContractRevision{
					ClusterId:  int32(cluster.ID),
					ProjectId:  int32(cluster.ProjectID),
					RevisionId: revisionID,
				},
			})
			_, err = c.Config().ClusterControlPlaneClient.DeleteCluster(ctx, cl)
			if err != nil {
				e := fmt.Errorf("error deleting cluster %d: %w", cluster.ID, err)
				c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
				return
			}
		}
	}

	err := c.Repo().Cluster().DeleteCluster(cluster)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, cluster.ToClusterType())
}
