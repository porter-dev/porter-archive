package aws

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/aws/aws-sdk-go/service/eks"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type GetClusterInfoHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetClusterInfoHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetClusterInfoHandler {
	return &GetClusterInfoHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetClusterInfoHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	if cluster.AWSIntegrationID == 0 {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("no AWS cluster found with cluster ID: %d", cluster.ID)))
		return
	}

	awsInt, err := c.Repo().AWSIntegration().ReadAWSIntegration(proj.ID, cluster.AWSIntegrationID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no AWS integration found with project ID: %d and "+
				"integration ID: %d", proj.ID, cluster.AWSIntegrationID)))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error fetching AWS integration with project ID: %d and "+
			"integration ID: %d. Error: %w", proj.ID, cluster.AWSIntegrationID, err)))
		return
	}

	awsSession, err := awsInt.GetSession()

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("error fetching new session for AWS with "+
			"project ID: %d and integration ID: %d. Error: %w", proj.ID, cluster.AWSIntegrationID, err), http.StatusConflict))
		return
	}

	clusterName := cluster.Name

	if strings.HasPrefix(clusterName, "arn:aws:eks:") {
		parts := strings.Split(clusterName, "/")
		clusterName = parts[len(parts)-1]
	}

	awsConf := aws.NewConfig()

	if awsInt.AWSRegion != "" {
		awsConf = awsConf.WithRegion(awsInt.AWSRegion)
	}

	eksSvc := eks.New(awsSession, awsConf)

	clusterInfo, err := eksSvc.DescribeCluster(&eks.DescribeClusterInput{
		Name: &clusterName,
	})

	if err != nil || clusterInfo.Cluster == nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	ec2Svc := ec2.New(awsSession, awsConf)

	subnetsInfo, err := ec2Svc.DescribeSubnets(&ec2.DescribeSubnetsInput{
		SubnetIds: clusterInfo.Cluster.ResourcesVpcConfig.SubnetIds,
	})

	if err != nil || len(subnetsInfo.Subnets) == 0 {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &types.GetAWSClusterInfoResponse{
		Name:       clusterName,
		K8sVersion: *clusterInfo.Cluster.Version,
		EKSVersion: *clusterInfo.Cluster.PlatformVersion,
	}

	for _, subnet := range subnetsInfo.Subnets {
		res.Subnets = append(res.Subnets, &types.AWSSubnet{
			AvailabilityZone:        *subnet.AvailabilityZone,
			AvailableIPAddressCount: *subnet.AvailableIpAddressCount,
		})
	}

	c.WriteResult(w, r, res)
}
