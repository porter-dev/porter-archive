package datastore

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"

	"connectrpc.com/connect"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
	"k8s.io/utils/pointer"
)

// UpdateDatastoreHandler is a struct for updating datastores.
// Currently, this is expected to used once (on create) and then not again, however the 'update' terminology was proactively used
// so we can reuse this handler when we support updates in the future.
type UpdateDatastoreHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewUpdateDatastoreHandler constructs a datastore UpdateDatastoreHandler
func NewUpdateDatastoreHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateDatastoreHandler {
	return &UpdateDatastoreHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// UpdateDatastoreRequest is the expected format of the request body
type UpdateDatastoreRequest struct {
	Name   string                 `json:"name"`
	Type   string                 `json:"type"`
	Engine string                 `json:"engine"`
	Values map[string]interface{} `json:"values"`
}

// UpdateDatastoreResponse is the expected format of the response body
type UpdateDatastoreResponse struct{}

// ServeHTTP updates a datastore using the decoded values
func (h *UpdateDatastoreHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-datastore")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &UpdateDatastoreRequest{}
	if ok := h.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding update datastore request")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "name", Value: request.Name},
		telemetry.AttributeKV{Key: "type", Value: request.Type},
		telemetry.AttributeKV{Key: "engine", Value: request.Engine},
	)

	region, err := h.getClusterRegion(ctx, project.ID, cluster.ID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting cluster region")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// assume we are creating for now; will add update support later
	datastoreProto := &porterv1.ManagedDatastore{
		CloudProvider:                     porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS,
		CloudProviderCredentialIdentifier: cluster.CloudProviderCredentialIdentifier,
		Region:                            region,
		ConnectedClusters: &porterv1.ConnectedClusters{
			ConnectedClusterIds: []int64{int64(cluster.ID)},
		},
	}
	marshaledValues, err := json.Marshal(request.Values)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error marshaling values")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var datastoreValues struct {
		Config struct {
			Name               string `json:"name"`
			DatabaseName       string `json:"databaseName"`
			MasterUsername     string `json:"masterUsername"`
			MasterUserPassword string `json:"masterUserPassword"`
			AllocatedStorage   int64  `json:"allocatedStorage"`
			InstanceClass      string `json:"instanceClass"`
			EngineVersion      string `json:"engineVersion"`
		} `json:"config"`
	}
	err = json.Unmarshal(marshaledValues, &datastoreValues)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error unmarshaling rds postgres values")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if datastoreValues.Config.Name == "" {
		err = telemetry.Error(ctx, span, nil, "datastore name is required")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	datastoreProto.Name = datastoreValues.Config.Name

	switch request.Type {
	case "RDS":
		var engine porterv1.EnumAwsRdsEngine
		switch request.Engine {
		case "POSTGRES":
			engine = porterv1.EnumAwsRdsEngine_ENUM_AWS_RDS_ENGINE_POSTGRESQL
		case "AURORA-POSTGRES":
			engine = porterv1.EnumAwsRdsEngine_ENUM_AWS_RDS_ENGINE_AURORA_POSTGRESQL
		default:
			err = telemetry.Error(ctx, span, nil, "invalid rds engine")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
		datastoreProto.Kind = porterv1.EnumDatastoreKind_ENUM_DATASTORE_KIND_AWS_RDS
		datastoreProto.KindValues = &porterv1.ManagedDatastore_AwsRdsKind{
			AwsRdsKind: &porterv1.AwsRds{
				DatabaseName:              pointer.String(datastoreValues.Config.DatabaseName),
				MasterUsername:            pointer.String(datastoreValues.Config.MasterUsername),
				MasterUserPasswordLiteral: pointer.String(datastoreValues.Config.MasterUserPassword),
				AllocatedStorageGigabytes: pointer.Int64(datastoreValues.Config.AllocatedStorage),
				InstanceClass:             pointer.String(datastoreValues.Config.InstanceClass),
				Engine:                    engine,
				EngineVersion:             pointer.String(datastoreValues.Config.EngineVersion),
			},
		}
	case "ELASTICACHE":
		datastoreProto.Kind = porterv1.EnumDatastoreKind_ENUM_DATASTORE_KIND_AWS_ELASTICACHE
		datastoreProto.KindValues = &porterv1.ManagedDatastore_AwsElasticacheKind{
			AwsElasticacheKind: &porterv1.AwsElasticache{
				Engine:                    porterv1.EnumAwsElasticacheEngine_ENUM_AWS_ELASTICACHE_ENGINE_REDIS,
				InstanceClass:             pointer.String(datastoreValues.Config.InstanceClass),
				MasterUserPasswordLiteral: pointer.String(datastoreValues.Config.MasterUserPassword),
				EngineVersion:             pointer.String(datastoreValues.Config.EngineVersion),
			},
		}
	default:
		err = telemetry.Error(ctx, span, nil, "invalid datastore type")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	req := connect.NewRequest(&porterv1.UpdateDatastoreRequest{
		ProjectId: int64(project.ID),
		Datastore: datastoreProto,
	})
	_, err = h.Config().ClusterControlPlaneClient.UpdateDatastore(ctx, req)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error updating datastore")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	h.WriteResult(w, r, UpdateDatastoreResponse{})
}

// getClusterRegion is a very hacky way of getting the region of the cluster; this will be replaced once we allow the user to specify region from the frontend
func (h *UpdateDatastoreHandler) getClusterRegion(
	ctx context.Context,
	projectId uint,
	clusterId uint,
) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-cluster-region")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: projectId},
		telemetry.AttributeKV{Key: "cluster-id", Value: clusterId},
	)

	var region string

	var clusterContractRecord *models.APIContractRevision
	clusterContractRevisions, err := h.Config().Repo.APIContractRevisioner().List(ctx, projectId, repository.WithClusterID(clusterId), repository.WithLatest(true))
	if err != nil {
		return region, telemetry.Error(ctx, span, err, "error getting latest cluster contract revisions")
	}
	if len(clusterContractRevisions) == 0 {
		return region, telemetry.Error(ctx, span, nil, "no cluster contract revisions found")
	}
	clusterContractRecord = clusterContractRevisions[0]
	var clusterContractProto porterv1.Contract
	decoded, err := base64.StdEncoding.DecodeString(clusterContractRecord.Base64Contract)
	if err != nil {
		return region, telemetry.Error(ctx, span, err, "error decoding cluster contract")
	}
	err = helpers.UnmarshalContractObject(decoded, &clusterContractProto)
	if err != nil {
		return region, telemetry.Error(ctx, span, err, "error unmarshalling cluster contract")
	}
	clusterProto := clusterContractProto.Cluster
	if clusterProto == nil {
		return region, telemetry.Error(ctx, span, nil, "cluster contract proto is nil")
	}
	eksKindValues := clusterProto.GetEksKind()
	if eksKindValues == nil {
		return region, telemetry.Error(ctx, span, nil, "eks kind values are nil")
	}
	region = eksKindValues.Region
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "region", Value: region})

	return region, nil
}
