package release

import (
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
	"helm.sh/helm/v3/pkg/chart"
)

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
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace := r.Context().Value(types.NamespaceScope).(string)
	operationID := oauth.CreateRandomState()

	c.Config().AnalyticsClient.Track(analytics.ApplicationLaunchStartTrack(
		&analytics.ApplicationLaunchStartTrackOpts{
			ClusterScopedTrackOpts: analytics.GetClusterScopedTrackOpts(user.ID, cluster.ProjectID, cluster.ID),
			FlowID:                 operationID,
		},
	))

	helmAgent, err := c.GetHelmAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.CreateAddonRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.TemplateVersion == "latest" {
		request.TemplateVersion = ""
	}

	chart, err := LoadChart(c.Config(), &LoadAddonChartOpts{
		ProjectID:       proj.ID,
		RepoURL:         request.RepoURL,
		TemplateName:    request.TemplateName,
		TemplateVersion: request.TemplateVersion,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
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

	helmRelease, err := helmAgent.InstallChart(conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error installing a new chart: %s", err.Error()),
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

func LoadChart(config *config.Config, opts *LoadAddonChartOpts) (*chart.Chart, error) {
	// if the chart repo url is one of the specified application/addon charts, just load public
	if opts.RepoURL == config.ServerConf.DefaultAddonHelmRepoURL || opts.RepoURL == config.ServerConf.DefaultApplicationHelmRepoURL {
		return loader.LoadChartPublic(opts.RepoURL, opts.TemplateName, opts.TemplateVersion)
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

					return loader.LoadChart(&loader.BasicAuthClient{
						Username: string(basic.Username),
						Password: string(basic.Password),
					}, hr.RepoURL, opts.TemplateName, opts.TemplateVersion)
				} else {
					return loader.LoadChartPublic(hr.RepoURL, opts.TemplateName, opts.TemplateVersion)
				}
			}
		}
	}

	return nil, fmt.Errorf("chart repo not found")
}
