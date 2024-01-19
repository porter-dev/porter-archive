package release

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/telemetry"
	"github.com/stefanmcshane/helm/pkg/chart"
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

	conf := &helm.InstallChartConfig{
		Chart:      chart,
		Name:       request.Name,
		Namespace:  namespace,
		Values:     request.Values,
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
