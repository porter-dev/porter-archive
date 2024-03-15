package datastore

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"connectrpc.com/connect"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/release"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/datastore"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
	betaFeaturesEnabled := project.GetFeatureFlag(models.BetaFeaturesEnabled, h.Config().LaunchDarklyClient)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "name", Value: request.Name},
		telemetry.AttributeKV{Key: "type", Value: request.Type},
		telemetry.AttributeKV{Key: "engine", Value: request.Engine},
		telemetry.AttributeKV{Key: "beta-features-enabled", Value: betaFeaturesEnabled},
	)

	if !betaFeaturesEnabled {
		err := h.legacy_DatastoreCreateFlow(ctx, request, project, cluster, r)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating datastore")
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		h.WriteResult(w, r, UpdateDatastoreResponse{})
		return
	}

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

	req := connect.NewRequest(&porterv1.PatchCloudContractRequest{
		ProjectId:    int64(project.ID),
		Operation:    porterv1.EnumPatchCloudContractOperation_ENUM_PATCH_CLOUD_CONTRACT_OPERATION_UPDATE,
		ResourceType: porterv1.EnumPatchCloudContractType_ENUM_PATCH_CLOUD_CONTRACT_TYPE_DATASTORE,
		ResourceValues: &porterv1.PatchCloudContractRequest_Datastore{
			Datastore: datastoreProto,
		},
	})
	_, err = h.Config().ClusterControlPlaneClient.PatchCloudContract(ctx, req)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error patching cloud contract")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	h.WriteResult(w, r, UpdateDatastoreResponse{})
}

func (h *UpdateDatastoreHandler) legacy_DatastoreCreateFlow(
	ctx context.Context,
	request *UpdateDatastoreRequest,
	project *models.Project,
	cluster *models.Cluster,
	r *http.Request,
) error {
	ctx, span := telemetry.NewSpan(ctx, "legacy-datastore-create")
	defer span.End()

	err := h.InstallDatastore(ctx, InstallDatastoreInput{
		Name:    request.Name,
		Type:    request.Type,
		Engine:  request.Engine,
		Values:  request.Values,
		Request: r,
	})
	if err != nil {
		return telemetry.Error(ctx, span, err, "error installing datastore")
	}

	record, err := datastore.CreateOrGetRecord(ctx, datastore.CreateOrGetRecordInput{
		ProjectID:           project.ID,
		ClusterID:           cluster.ID,
		Name:                request.Name,
		Type:                request.Type,
		Engine:              request.Engine,
		DatastoreRepository: h.Repo().Datastore(),
		ClusterRepository:   h.Repo().Cluster(),
	})
	if err != nil {
		return telemetry.Error(ctx, span, err, "error retrieving datastore record")
	}

	updateReq := connect.NewRequest(&porterv1.UpdateDatastoreRequest{
		ProjectId:   int64(project.ID),
		DatastoreId: record.ID.String(),
	})

	_, err = h.Config().ClusterControlPlaneClient.UpdateDatastore(ctx, updateReq)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error calling ccp update datastore")
	}

	return nil
}

// InstallDatastoreInput is the input type for InstallDatastore
type InstallDatastoreInput struct {
	Name    string
	Type    string
	Engine  string
	Values  map[string]interface{}
	Request *http.Request
}

// InstallDatastore installs a datastore by helm installing a template with the provided values
func (h *UpdateDatastoreHandler) InstallDatastore(ctx context.Context, inp InstallDatastoreInput) error {
	ctx, span := telemetry.NewSpan(ctx, "datastore-install")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "name", Value: inp.Name},
		telemetry.AttributeKV{Key: "type", Value: inp.Type},
		telemetry.AttributeKV{Key: "engine", Value: inp.Engine},
	)

	templateName, err := templateNameFromDatastoreTypeAndEngine(inp.Type, inp.Engine)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error getting template name from datastore type and engine")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "template-name", Value: templateName})

	helmAgent, err := h.GetHelmAgent(ctx, inp.Request, cluster, release.Namespace_ACKSystem)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error creating helm agent")
	}

	chart, err := release.LoadChart(ctx, h.Config(), &release.LoadAddonChartOpts{
		ProjectID:    proj.ID,
		RepoURL:      h.Config().Metadata.DefaultAddonHelmRepoURL,
		TemplateName: templateName,
	})
	if err != nil {
		return telemetry.Error(ctx, span, nil, "error loading chart")
	}

	registries, err := h.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error retrieving project registry")
	}

	vpcConfig, err := h.getVPCConfig(ctx, templateName, proj, cluster)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error retrieving vpc config")
	}

	if err := h.performAddonPreinstall(ctx, inp.Request, templateName, cluster); err != nil {
		return telemetry.Error(ctx, span, err, "error performing addon preinstall")
	}

	values := inp.Values
	values["vpcConfig"] = vpcConfig

	conf := &helm.InstallChartConfig{
		Chart:      chart,
		Name:       inp.Name,
		Namespace:  release.Namespace_ACKSystem,
		Values:     values,
		Cluster:    cluster,
		Repo:       h.Repo(),
		Registries: registries,
	}

	_, err = helmAgent.InstallChart(ctx, conf, h.Config().DOConf, h.Config().ServerConf.DisablePullSecretsInjection)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error installing chart")
	}

	return nil
}

func (h *UpdateDatastoreHandler) getVPCConfig(ctx context.Context, templateName string, project *models.Project, cluster *models.Cluster) (map[string]any, error) {
	ctx, span := telemetry.NewSpan(ctx, "datastore-get-vpc-config")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cloud-provider", Value: cluster.CloudProvider},
		telemetry.AttributeKV{Key: "template-name", Value: templateName},
	)

	vpcConfig := map[string]any{}
	if cluster.CloudProvider != SupportedDatastoreCloudProvider_AWS {
		return vpcConfig, nil
	}

	awsTemplates := map[string]string{
		"elasticache-redis":     "elasticache",
		"rds-postgresql":        "rds",
		"rds-postgresql-aurora": "rds",
	}

	serviceType, ok := awsTemplates[templateName]
	if !ok {
		return vpcConfig, nil
	}

	req := connect.NewRequest(&porterv1.SharedNetworkSettingsRequest{
		ProjectId:   int64(project.ID),
		ClusterId:   int64(cluster.ID),
		ServiceType: serviceType,
	})

	resp, err := h.Config().ClusterControlPlaneClient.SharedNetworkSettings(ctx, req)
	if err != nil {
		return vpcConfig, telemetry.Error(ctx, span, err, "error fetching cluster network settings from ccp")
	}

	vpcConfig["cidrBlock"] = resp.Msg.CidrRange
	vpcConfig["subnetIDs"] = resp.Msg.SubnetIds
	switch resp.Msg.CloudProvider {
	case *porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS.Enum():
		vpcConfig["awsRegion"] = resp.Msg.Region
		vpcConfig["vpcID"] = resp.Msg.GetEksCloudProviderNetwork().Id
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "aws-region", Value: resp.Msg.Region},
			telemetry.AttributeKV{Key: "vpc-id", Value: resp.Msg.GetEksCloudProviderNetwork().Id},
		)
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cidr-block", Value: resp.Msg.CidrRange},
		telemetry.AttributeKV{Key: "subnet-ids", Value: strings.Join(resp.Msg.SubnetIds, ",")},
	)

	return vpcConfig, nil
}

func (h *UpdateDatastoreHandler) scaleAckChartDeployment(ctx context.Context, chart string, agent *kubernetes.Agent) error {
	ctx, span := telemetry.NewSpan(ctx, "scale-ack-chart")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "chart-name", Value: chart},
	)

	scale, err := agent.Clientset.AppsV1().Deployments(release.Namespace_ACKSystem).GetScale(ctx, chart, metav1.GetOptions{})
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed getting deployment")
	}
	if scale.Spec.Replicas > 0 {
		return nil
	}

	scale.Spec.Replicas = 1
	if _, err := agent.Clientset.AppsV1().Deployments(release.Namespace_ACKSystem).UpdateScale(ctx, chart, scale, metav1.UpdateOptions{}); err != nil {
		return telemetry.Error(ctx, span, err, "failed scaling deployment up")
	}

	return nil
}

func (h *UpdateDatastoreHandler) performAddonPreinstall(ctx context.Context, r *http.Request, templateName string, cluster *models.Cluster) error {
	ctx, span := telemetry.NewSpan(ctx, "datastore-addon-preinstall")
	defer span.End()

	awsTemplates := map[string][]string{
		"elasticache-redis":     {"ack-chart-ec2", "ack-chart-elasticache"},
		"rds-postgresql":        {"ack-chart-ec2", "ack-chart-rds"},
		"rds-postgresql-aurora": {"ack-chart-ec2", "ack-chart-rds"},
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "template-name", Value: templateName},
		telemetry.AttributeKV{Key: "cloud-provider", Value: cluster.CloudProvider},
	)

	if cluster.CloudProvider != SupportedDatastoreCloudProvider_AWS {
		return nil
	}

	if _, ok := awsTemplates[templateName]; !ok {
		return nil
	}

	agent, err := h.GetAgent(r, cluster, "")
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to get k8s agent")
	}

	if _, err = agent.GetNamespace(release.Namespace_EnvironmentGroups); err != nil {
		if _, err := agent.CreateNamespace(release.Namespace_EnvironmentGroups, map[string]string{}); err != nil {
			return telemetry.Error(ctx, span, err, "failed creating porter-env-group namespace")
		}
	}

	for _, chart := range awsTemplates[templateName] {
		if err := h.scaleAckChartDeployment(ctx, chart, agent); err != nil {
			return telemetry.Error(ctx, span, err, "failed scaling ack chart deployment")
		}
	}

	return nil
}

func templateNameFromDatastoreTypeAndEngine(databaseType string, databaseEngine string) (string, error) {
	switch databaseType {
	case "RDS":
		switch databaseEngine {
		case "POSTGRES":
			return "rds-postgresql", nil
		case "AURORA-POSTGRES":
			return "rds-postgresql-aurora", nil
		default:
			return "", errors.New("invalid database engine")
		}
	case "ELASTICACHE":
		switch databaseEngine {
		case "REDIS":
			return "elasticache-redis", nil
		default:
			return "", errors.New("invalid database engine")
		}
	default:
		return "", errors.New("invalid database type")
	}
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
