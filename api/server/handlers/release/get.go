package release

import (
	"net/http"

	semver "github.com/Masterminds/semver/v3"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/templater/parser"
	"gorm.io/gorm"
	"helm.sh/helm/v3/pkg/release"
)

type ReleaseGetHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewReleaseGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ReleaseGetHandler {
	return &ReleaseGetHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ReleaseGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)

	res := &types.Release{
		Release: helmRelease,
	}

	// look up the release in the database; if not found, do not populate Porter fields
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	release, err := c.Repo().Release().ReadRelease(cluster.ID, helmRelease.Name, helmRelease.Namespace)

	if err == nil {
		res.PorterRelease = release.ToReleaseType()

		res.ID = release.ID
		res.WebhookToken = release.WebhookToken

		if release.GitActionConfig != nil {
			res.GitActionConfig = release.GitActionConfig.ToGitActionConfigType()
		}
	} else if err != gorm.ErrRecordNotFound {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	} else {
		res.PorterRelease = &types.PorterRelease{}
	}

	// detect if Porter application chart and attempt to get the latest version
	// from chart repo
	cache := c.Config().URLCache
	chartRepoURL, foundFirst := cache.GetURL(helmRelease.Chart.Metadata.Name)

	if !foundFirst {
		cache.Update()

		chartRepoURL, _ = cache.GetURL(helmRelease.Chart.Metadata.Name)
	}

	if chartRepoURL != "" {
		repoIndex, err := loader.LoadRepoIndexPublic(chartRepoURL)

		if err == nil {
			porterChart := loader.FindPorterChartInIndexList(repoIndex, res.Chart.Metadata.Name)
			res.LatestVersion = res.Chart.Metadata.Version

			// set latest version to the greater of porterChart.Versions and res.Chart.Metadata.Version
			porterChartVersion, porterChartErr := semver.NewVersion(porterChart.Versions[0])
			currChartVersion, currChartErr := semver.NewVersion(res.Chart.Metadata.Version)

			if currChartErr == nil && porterChartErr == nil && porterChartVersion.GreaterThan(currChartVersion) {
				res.LatestVersion = porterChart.Versions[0]
			}
		}
	}

	// look for the form using the dynamic client
	dynClient, err := c.GetDynamicClient(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	parserDef := &parser.ClientConfigDefault{
		DynamicClient: dynClient,
		HelmChart:     helmRelease.Chart,
		HelmRelease:   helmRelease,
	}

	form, err := parser.GetFormFromRelease(parserDef, helmRelease)

	if err != nil {
		// TODO: log non-fatal parsing error
	} else {
		res.Form = form
	}

	c.WriteResult(w, r, res)
}
