package datastore

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"connectrpc.com/connect"
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
	"github.com/porter-dev/porter/internal/telemetry"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
		err := telemetry.Error(ctx, span, err, "error retrieving datastore record")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// TODO: replace this with ccp call
	err = h.InstallDatastore(ctx, InstallDatastoreInput{
		Name:    record.Name,
		Type:    record.Type,
		Engine:  record.Engine,
		Values:  request.Values,
		Request: r,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error installing datastore")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	updateReq := connect.NewRequest(&porterv1.UpdateDatastoreRequest{
		ProjectId:   int64(project.ID),
		DatastoreId: record.ID.String(),
	})

	_, err = h.Config().ClusterControlPlaneClient.UpdateDatastore(ctx, updateReq)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp update datastore")
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// TODO: create an API-level representation of the db model rather than returning the model directly
	h.WriteResult(w, r, record)
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
