package datastore

import (
	"context"
	"net/http"
	"sort"

	"github.com/aws/aws-sdk-go/aws/arn"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListResponseEntry describes an outbound datastore status response entry
type ListResponseEntry struct {
	// Name is the name of the datastore
	Name string `json:"name"`

	// Type is the type of the datastore
	Type string `json:"type"`
}

// ListHandler is a struct for handling datastore status requests
type ListHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewListHandler constructs a datastore ListHandler
func NewListHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListHandler {
	return &ListHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (h *ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-datastore-list")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	cloudProviderType, err := requestutils.GetURLParamString(r, types.URLParamCloudProviderType)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing cloud provider type")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cloud-provider-type", Value: cloudProviderType})

	cloudProviderID, err := requestutils.GetURLParamString(r, types.URLParamCloudProviderID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing cloud provider id")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cloud-provider-id", Value: cloudProviderID})

	switch cloudProviderType {
	case "aws":
		res, err := h.AwsDatastores(ctx, *project, cloudProviderID, r)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error retrieving datastores")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
		h.WriteResult(w, r, res)
	default:
		err := telemetry.Error(ctx, span, nil, "unsupported cloud provider")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
}

// AwsDatastores retrieves all datastores provisioned to a given project/
func (h *ListHandler) AwsDatastores(ctx context.Context, project models.Project, awsAccountID string, r *http.Request) ([]ListResponseEntry, error) {
	ctx, span := telemetry.NewSpan(ctx, "aws-datastores")
	defer span.End()
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "project-id", Value: project.ID})

	res := []ListResponseEntry{}

	clusters, err := h.Repo().Cluster().ListClustersByProjectID(project.ID)
	if err != nil {
		return res, telemetry.Error(ctx, span, err, "clusters for project could not be retrieved")
	}

	capiProvisionerEnabled := project.GetFeatureFlag(models.CapiProvisionerEnabled, h.Config().LaunchDarklyClient)
	for _, cluster := range clusters {
		clusterInAccount := false
		if capiProvisionerEnabled {
			b, err := arn.Parse(cluster.CloudProviderCredentialIdentifier)
			if err != nil {
				return res, telemetry.Error(ctx, span, err, "cluster cloud provider arn could not be parsed")
			}

			clusterInAccount = b.AccountID == awsAccountID
		} else {
			if cluster.AWSIntegrationID == 0 {
				continue
			}

			awsIntegration, err := h.Repo().AWSIntegration().ReadAWSIntegration(project.ID, cluster.AWSIntegrationID)
			if err != nil {
				return res, telemetry.Error(ctx, span, err, "aws integration could not be found")
			}

			b, err := arn.Parse(awsIntegration.AWSArn)
			if err != nil {
				return res, telemetry.Error(ctx, span, err, "aws integration arn could not be parsed")
			}

			clusterInAccount = b.AccountID == awsAccountID
		}

		if clusterInAccount {
			datastores, err := h.getAwsDatastoresForCluster(ctx, r, cluster)
			if err != nil {
				return res, telemetry.Error(ctx, span, err, "error getting datastores cluster")
			}
			res = append(res, datastores...)
		}
	}

	sort.Slice(res, func(i, j int) bool {
		return res[i].Name < res[j].Name
	})

	return res, nil
}

func (h *ListHandler) getAwsDatastoresForCluster(ctx context.Context, r *http.Request, cluster *models.Cluster) ([]ListResponseEntry, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-aws-datastores")
	defer span.End()

	namespace := "ack-system"
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "namespace", Value: namespace})
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID})

	res := []ListResponseEntry{}
	helmAgent, err := h.GetHelmAgent(ctx, r, cluster, "")
	if err != nil {
		return res, telemetry.Error(ctx, span, err, "error getting helm agent")
	}

	request := &types.ListReleasesRequest{
		ReleaseListFilter: &types.ReleaseListFilter{
			Namespace: namespace,
			Limit:     100,
			Skip:      0,
			ByDate:    false,
			StatusFilter: []string{
				"deployed", "uninstalled", "pending", "pending", "pending-install", "pending-upgrade", "pending-rollback", "failed",
			},
		},
	}

	releases, err := helmAgent.ListReleases(ctx, namespace, request.ReleaseListFilter)
	if err != nil {
		return res, telemetry.Error(ctx, span, err, "error getting helm releases")
	}

	awsDatastoreCharts := map[string]bool{
		"elasticache-redis":     true,
		"rds-postgresql":        true,
		"rds-postgresql-aurora": true,
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "release-count", Value: len(releases)})
	for _, helmRel := range releases {
		if helmRel.Chart == nil {
			continue
		}

		if _, ok := awsDatastoreCharts[helmRel.Chart.Name()]; !ok {
			continue
		}

		res = append(res, ListResponseEntry{
			Name: helmRel.Name,
			Type: helmRel.Chart.Name(),
		})
	}

	return res, nil
}
