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
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/notifier/slack"
	"github.com/porter-dev/porter/internal/telemetry"
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-webhook-deploy-with-token-handler")
	defer span.End()

	token, _ := requestutils.GetURLParamString(r, types.URLParamToken)

	// retrieve release by token
	dbRelease, err := c.Repo().Release().ReadReleaseByWebhookToken(token)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			err = telemetry.Error(ctx, span, err, "release not found with given webhook")
			// throw forbidden error, since we don't want a way to verify if webhooks exist
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
			return
		}

		err = telemetry.Error(ctx, span, err, "error with reading release by webhook token")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if dbRelease == nil {
		err = telemetry.Error(ctx, span, nil, "release is nil with given webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}
	release := *dbRelease

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "release-id", Value: release.ID},
		telemetry.AttributeKV{Key: "release-name", Value: release.Name},
		telemetry.AttributeKV{Key: "release-namespace", Value: release.Namespace},
		telemetry.AttributeKV{Key: "cluster-id", Value: release.ClusterID},
		telemetry.AttributeKV{Key: "project-id", Value: release.ProjectID},
	)

	cluster, err := c.Repo().Cluster().ReadCluster(release.ProjectID, release.ClusterID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			err = telemetry.Error(ctx, span, err, "cluster not found for upgrade webhook")
			// throw forbidden error, since we don't want a way to verify if the cluster and project
			// still exist for a cluster that's been deleted
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
			return
		}

		err = telemetry.Error(ctx, span, err, "error with reading cluster for upgrade webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// in this case, we retrieve the agent by passing in the namespace field directly, since
	// it cannot be detected from the URL
	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, release.Namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to get helm agent for upgrade webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	request := &types.WebhookRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	rel, err := helmAgent.GetRelease(ctx, release.Name, 0, true)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "uanble to get release for upgrade webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
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
		err = telemetry.Error(ctx, span, err, "deploy")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(release.ProjectID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to list registries for upgrade webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
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
	if release.NotificationConfig != 0 {
		conf, err := c.Repo().NotificationConfig().ReadNotificationConfig(release.NotificationConfig)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "unable to read notification config for upgrade webhook")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		notifConf = conf.ToNotificationConfigType()
	}

	deplNotifier := slack.NewDeploymentNotifier(notifConf, slackInts...)

	notifyOpts := &notifier.NotifyOpts{
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

	rel, err = helmAgent.UpgradeReleaseByValues(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection, false)
	if err != nil {
		notifyOpts.Status = notifier.StatusHelmFailed
		notifyOpts.Info = err.Error()

		if !cluster.NotificationsDisabled {
			deplNotifier.Notify(notifyOpts)
		}
		err = telemetry.Error(ctx, span, err, "unable to upgrade release for upgrade webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if rel.Chart != nil && rel.Chart.Metadata.Name != "job" {
		notifyOpts.Status = notifier.StatusHelmDeployed
		notifyOpts.Version = rel.Version

		if !cluster.NotificationsDisabled {
			deplNotifier.Notify(notifyOpts)
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
		err = telemetry.Error(ctx, span, err, "error while running post upgrade hooks")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
}
