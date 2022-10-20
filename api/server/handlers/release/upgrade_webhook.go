package release

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/integrations/slack"
	"gorm.io/gorm"
)

type WebhookHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewWebhookHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *WebhookHandler {
	return &WebhookHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *WebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	token, _ := requestutils.GetURLParamString(r, types.URLParamToken)

	// retrieve release by token
	release, err := c.Repo().Release().ReadReleaseByWebhookToken(token)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// throw forbidden error, since we don't want a way to verify if webhooks exist
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(
				fmt.Errorf("release not found with given webhook"),
			))

			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	cluster, err := c.Repo().Cluster().ReadCluster(release.ProjectID, release.ClusterID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// throw forbidden error, since we don't want a way to verify if the cluster and project
			// still exist for a cluster that's been deleted
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(
				fmt.Errorf("cluster %d in project %d not found for upgrade webhook", release.ClusterID, release.ProjectID),
			))

			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// in this case, we retrieve the agent by passing in the namespace field directly, since
	// it cannot be detected from the URL
	helmAgent, err := c.GetHelmAgent(r, cluster, release.Namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.WebhookRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	rel, err := helmAgent.GetRelease(release.Name, 0, true)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// repository is set to current repository by default
	repository := rel.Config["image"].(map[string]interface{})["repository"]
	currTag := rel.Config["image"].(map[string]interface{})["tag"]

	gitAction := release.GitActionConfig

	if gitAction != nil && gitAction.ID != 0 && (repository == "porterdev/hello-porter" || repository == "public.ecr.aws/o1j4x7p4/hello-porter") {
		repository = gitAction.ImageRepoURI
	} else if gitAction != nil && gitAction.ID != 0 && (repository == "porterdev/hello-porter-job" || repository == "public.ecr.aws/o1j4x7p4/hello-porter-job") {
		repository = gitAction.ImageRepoURI
	}

	image := map[string]interface{}{}
	image["repository"] = repository

	image["tag"] = request.Commit

	if request.Commit == "" {
		image["tag"] = currTag
	}

	rel.Config["image"] = image

	if rel.Config["auto_deploy"] == false {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("Deploy webhook is disabled for this deployment."),
			http.StatusBadRequest,
		))

		return
	}

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(release.ProjectID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	conf := &helm.UpgradeReleaseConfig{
		Name:       release.Name,
		Cluster:    cluster,
		Repo:       c.Repo(),
		Registries: registries,
		Values:     rel.Config,
	}

	slackInts, _ := c.Repo().SlackIntegration().ListSlackIntegrationsByProjectID(release.ProjectID)

	var notifConf *types.NotificationConfig
	notifConf = nil
	if release != nil && release.NotificationConfig != 0 {
		conf, err := c.Repo().NotificationConfig().ReadNotificationConfig(release.NotificationConfig)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		notifConf = conf.ToNotificationConfigType()
	}

	notifier := slack.NewSlackNotifier(notifConf, slackInts...)

	notifyOpts := &slack.NotifyOpts{
		ProjectID:   release.ProjectID,
		ClusterID:   cluster.ID,
		ClusterName: cluster.Name,
		Name:        rel.Name,
		Namespace:   rel.Namespace,
		URL: fmt.Sprintf(
			"%s/applications/%s/%s/%s?project_id=%d",
			c.Config().ServerConf.ServerURL,
			url.PathEscape(cluster.Name),
			release.Namespace,
			rel.Name,
			cluster.ProjectID,
		),
	}

	rel, err = helmAgent.UpgradeReleaseByValues(conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)

	if err != nil {
		notifyOpts.Status = slack.StatusHelmFailed
		notifyOpts.Info = err.Error()

		if !cluster.NotificationsDisabled {
			notifier.Notify(notifyOpts)
		}

		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			err,
			http.StatusBadRequest,
		))

		return
	}

	if rel.Chart != nil && rel.Chart.Metadata.Name != "job" {
		notifyOpts.Status = slack.StatusHelmDeployed
		notifyOpts.Version = rel.Version

		if !cluster.NotificationsDisabled {
			notifier.Notify(notifyOpts)
		}
	}

	c.Config().AnalyticsClient.Track(analytics.ApplicationDeploymentWebhookTrack(&analytics.ApplicationDeploymentWebhookTrackOpts{
		ImageURI: fmt.Sprintf("%v", repository),
		ApplicationScopedTrackOpts: analytics.GetApplicationScopedTrackOpts(
			0,
			release.ProjectID,
			release.ClusterID,
			release.Name,
			release.Namespace,
			rel.Chart.Metadata.Name,
		),
	}))

	c.WriteResult(w, r, nil)

	err = postUpgrade(c.Config(), cluster.ProjectID, cluster.ID, rel)

	if err != nil {
		c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
		return
	}
}
