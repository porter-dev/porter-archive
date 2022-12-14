package aws

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	ec2Types "github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/aws/aws-sdk-go-v2/service/eks"
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
	ctx := r.Context()

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

	// clusterName := cluster.Name

	if strings.HasPrefix(cluster.Name, "arn:aws:eks:") {
		parts := strings.Split(cluster.Name, "/")
		cluster.Name = parts[len(parts)-1]
	}

	awsConf := awsInt.Config()

	eksSvc := eks.NewFromConfig(awsConf)

	clusterInfo, err := eksSvc.DescribeCluster(ctx, &eks.DescribeClusterInput{
		Name: &cluster.Name,
	})

	if err != nil || clusterInfo.Cluster == nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	ec2Svc := ec2.NewFromConfig(awsConf)

	res := &types.GetAWSClusterInfoResponse{
		Name:       cluster.Name,
		ARN:        *clusterInfo.Cluster.Arn,
		Status:     string(clusterInfo.Cluster.Status),
		K8sVersion: *clusterInfo.Cluster.Version,
		EKSVersion: *clusterInfo.Cluster.PlatformVersion,
	}

	subnetPaginate := ec2.NewDescribeSubnetsPaginator(ec2Svc, &ec2.DescribeSubnetsInput{
		Filters: []ec2Types.Filter{
			{
				Name: aws.String("vpc-id"),
				Values: []string{
					*clusterInfo.Cluster.ResourcesVpcConfig.VpcId,
				},
			},
		},
	})
	for subnetPaginate.HasMorePages() {
		page, err := subnetPaginate.NextPage(ctx)
		if err != nil {
			continue
		}
		for _, subnet := range page.Subnets {
			res.Subnets = append(res.Subnets, &types.AWSSubnet{
				SubnetID:                *subnet.SubnetId,
				AvailabilityZone:        *subnet.AvailabilityZone,
				AvailableIPAddressCount: int64(*subnet.AvailableIpAddressCount),
			})
		}
	}

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, res)
}
