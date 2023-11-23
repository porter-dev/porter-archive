package release

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/telemetry"
	"github.com/stefanmcshane/helm/pkg/chart"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Namespace_EnvironmentGroups is the base namespace for storing all environment groups.
const Namespace_EnvironmentGroups = "porter-env-group"

// Namespace_ACKSystem is the base namespace for interacting with ack chart controllers
const Namespace_ACKSystem = "ack-system"

type CreateAddonHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateAddonHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateAddonHandler {
	return &CreateAddonHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateAddonHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-addon")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)
	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	namespace := ctx.Value(types.NamespaceScope).(string)
	operationID := oauth.CreateRandomState()

	c.Config().AnalyticsClient.Track(analytics.ApplicationLaunchStartTrack(
		&analytics.ApplicationLaunchStartTrackOpts{
			ClusterScopedTrackOpts: analytics.GetClusterScopedTrackOpts(user.ID, cluster.ProjectID, cluster.ID),
			FlowID:                 operationID,
		},
	))

	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, nil, "error creating helm agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	request := &types.CreateAddonRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.TemplateVersion == "latest" {
		request.TemplateVersion = ""
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "repo-url", Value: request.RepoURL},
		telemetry.AttributeKV{Key: "template-name", Value: request.TemplateName},
		telemetry.AttributeKV{Key: "template-version", Value: request.TemplateVersion},
	)

	chart, err := LoadChart(ctx, c.Config(), &LoadAddonChartOpts{
		ProjectID:       proj.ID,
		RepoURL:         request.RepoURL,
		TemplateName:    request.TemplateName,
		TemplateVersion: request.TemplateVersion,
	})
	if err != nil {
		err = telemetry.Error(ctx, span, nil, "error loading chart")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error retrieving project registry")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	vpcConfig, err := c.getVPCConfig(ctx, request, proj, cluster)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error retrieving vpc config")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if err := c.performAddonPreinstall(ctx, r, request.TemplateName, cluster); err != nil {
		err = telemetry.Error(ctx, span, err, "error performing addon preinstall")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	values := request.Values
	values["vpcConfig"] = vpcConfig

	conf := &helm.InstallChartConfig{
		Chart:      chart,
		Name:       request.Name,
		Namespace:  namespace,
		Values:     values,
		Cluster:    cluster,
		Repo:       c.Repo(),
		Registries: registries,
	}

	helmRelease, err := helmAgent.InstallChart(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			telemetry.Error(ctx, span, nil, fmt.Sprintf("error installing a new chart: %s", err.Error())),
			http.StatusBadRequest,
		))
		return
	}

	c.Config().AnalyticsClient.Track(analytics.ApplicationLaunchSuccessTrack(
		&analytics.ApplicationLaunchSuccessTrackOpts{
			ApplicationScopedTrackOpts: analytics.GetApplicationScopedTrackOpts(
				user.ID,
				cluster.ProjectID,
				cluster.ID,
				helmRelease.Name,
				helmRelease.Namespace,
				chart.Metadata.Name,
			),
			FlowID: operationID,
		},
	))
}

type LoadAddonChartOpts struct {
	ProjectID                              uint
	RepoURL, TemplateName, TemplateVersion string
}

// LoadChart fetches a chart from a remote repo
func LoadChart(ctx context.Context, config *config.Config, opts *LoadAddonChartOpts) (*chart.Chart, error) {
	// if the chart repo url is one of the specified application/addon charts, just load public
	if opts.RepoURL == config.ServerConf.DefaultAddonHelmRepoURL || opts.RepoURL == config.ServerConf.DefaultApplicationHelmRepoURL {
		return loader.LoadChartPublic(ctx, opts.RepoURL, opts.TemplateName, opts.TemplateVersion)
	} else {
		// load the helm repos in the project
		hrs, err := config.Repo.HelmRepo().ListHelmReposByProjectID(opts.ProjectID)
		if err != nil {
			return nil, err
		}

		for _, hr := range hrs {
			if hr.RepoURL == opts.RepoURL {
				if hr.BasicAuthIntegrationID != 0 {
					// read the basic integration id
					basic, err := config.Repo.BasicIntegration().ReadBasicIntegration(opts.ProjectID, hr.BasicAuthIntegrationID)
					if err != nil {
						return nil, err
					}

					return loader.LoadChart(ctx,
						&loader.BasicAuthClient{
							Username: string(basic.Username),
							Password: string(basic.Password),
						}, hr.RepoURL, opts.TemplateName, opts.TemplateVersion)
				} else {
					return loader.LoadChartPublic(ctx, hr.RepoURL, opts.TemplateName, opts.TemplateVersion)
				}
			}
		}
	}

	return nil, fmt.Errorf("chart repo not found")
}

func (c *CreateAddonHandler) performAddonPreinstall(ctx context.Context, r *http.Request, templateName string, cluster *models.Cluster) error {
	ctx, span := telemetry.NewSpan(ctx, "addon-preinstall")
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

	if cluster.CloudProvider != "AWS" {
		return nil
	}

	if _, ok := awsTemplates[templateName]; !ok {
		return nil
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to get k8s agent")
	}

	if _, err = agent.GetNamespace(Namespace_EnvironmentGroups); err != nil {
		if _, err := agent.CreateNamespace(Namespace_EnvironmentGroups, map[string]string{}); err != nil {
			return telemetry.Error(ctx, span, err, "failed creating porter-env-group namespace")
		}
	}

	for _, chart := range awsTemplates[templateName] {
		if err := c.scaleAckChartDeployment(ctx, chart, agent); err != nil {
			return telemetry.Error(ctx, span, err, "failed scaling ack chart deployment")
		}
	}

	return nil
}

func (c *CreateAddonHandler) scaleAckChartDeployment(ctx context.Context, chart string, agent *kubernetes.Agent) error {
	ctx, span := telemetry.NewSpan(ctx, "scale-ack-chart")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "namespace", Value: Namespace_ACKSystem},
		telemetry.AttributeKV{Key: "chart-name", Value: chart},
	)

	scale, err := agent.Clientset.AppsV1().Deployments(Namespace_ACKSystem).GetScale(ctx, chart, metav1.GetOptions{})
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed getting deployment")
	}
	if scale.Spec.Replicas > 0 {
		return nil
	}

	scale.Spec.Replicas = 1
	if _, err := agent.Clientset.AppsV1().Deployments(Namespace_ACKSystem).UpdateScale(ctx, chart, scale, metav1.UpdateOptions{}); err != nil {
		return telemetry.Error(ctx, span, err, "failed scaling deployment up")
	}

	return nil
}

type VpcConfig struct {
	AWSRegion string   `json:"awsRegion"`
	CIDRBlock string   `json:"cidrBlock"`
	SubnetIDs []string `json:"subnetIDs"`
	VpcID     string   `json:"vpcID"`
}

func (c *CreateAddonHandler) getVPCConfig(ctx context.Context, request *types.CreateAddonRequest, project *models.Project, cluster *models.Cluster) (map[string]any, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-vpc-config")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cloud-provider", Value: cluster.CloudProvider},
		telemetry.AttributeKV{Key: "template-name", Value: request.TemplateName},
	)

	vpcConfig := map[string]any{}
	if cluster.CloudProvider != "AWS" {
		return vpcConfig, nil
	}

	awsTemplates := map[string]string{
		"elasticache-redis":     "elasticache",
		"rds-postgresql":        "rds",
		"rds-postgresql-aurora": "rds",
	}

	serviceType, ok := awsTemplates[request.TemplateName]
	if !ok {
		return vpcConfig, nil
	}

	req := connect.NewRequest(&porterv1.SharedNetworkSettingsRequest{
		ProjectId:   int64(project.ID),
		ClusterId:   int64(cluster.ID),
		ServiceType: serviceType,
	})

	resp, err := c.Config().ClusterControlPlaneClient.SharedNetworkSettings(ctx, req)
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
