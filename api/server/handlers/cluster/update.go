package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ClusterUpdateHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewClusterUpdateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ClusterUpdateHandler {
	return &ClusterUpdateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ClusterUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.UpdateClusterRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// if the cluster has an AWS integration, and the request does not have a cluster name attached, make
	// sure that the old cluster name is set
	if cluster.AWSIntegrationID != 0 && request.AWSClusterID == "" {
		awsInt, err := c.Repo().AWSIntegration().ReadAWSIntegration(cluster.ProjectID, cluster.AWSIntegrationID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		if string(awsInt.AWSClusterID) == "" {
			awsInt.AWSClusterID = []byte(cluster.Name)

			awsInt, err = c.Repo().AWSIntegration().OverwriteAWSIntegration(awsInt)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		}
	} else if request.AWSClusterID != "" {
		cluster.AWSClusterID = request.AWSClusterID
	}

	if request.AgentIntegrationEnabled != nil {
		cluster.AgentIntegrationEnabled = *request.AgentIntegrationEnabled
	}

	if request.Name != "" && cluster.Name != request.Name {
		cluster.Name = request.Name
	}

	cluster, err := c.Repo().Cluster().UpdateCluster(cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, cluster.ToClusterType())
}
