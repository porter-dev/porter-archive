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
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/integrations/slack"
	"github.com/porter-dev/porter/internal/models"
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
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("release not found with given webhook"),
			http.StatusBadRequest,
		))

		return
	}

	cluster, err := c.Repo().Cluster().ReadCluster(release.ProjectID, release.ClusterID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	helmAgent, err := c.GetHelmAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.WebhookRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	rel, err := helmAgent.GetRelease(release.Name, 0)

	// repository is set to current repository by default
	repository := rel.Config["image"].(map[string]interface{})["repository"]

	gitAction := release.GitActionConfig

	if gitAction != nil && gitAction.ID != 0 && (repository == "porterdev/hello-porter" || repository == "public.ecr.aws/o1j4x7p4/hello-porter") {
		repository = gitAction.ImageRepoURI
	} else if gitAction != nil && gitAction.ID != 0 && (repository == "porterdev/hello-porter-job" || repository == "public.ecr.aws/o1j4x7p4/hello-porter-job") {
		repository = gitAction.ImageRepoURI
	}

	image := map[string]interface{}{}
	image["repository"] = repository
	image["tag"] = request.Commit
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

	var notifConf *models.NotificationConfigExternal
	notifConf = nil
	if release != nil && release.NotificationConfig != 0 {
		conf, err := c.Repo().NotificationConfig().ReadNotificationConfig(release.NotificationConfig)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		notifConf = conf.Externalize()
	}

	notifier := slack.NewSlackNotifier(notifConf, slackInts...)

	notifyOpts := &slack.NotifyOpts{
		ProjectID:   release.ProjectID,
		ClusterID:   cluster.ID,
		ClusterName: cluster.Name,
		Name:        rel.Name,
		Namespace:   rel.Namespace,
		URL: fmt.Sprintf(
			"%s/applications/%s/%s/%s",
			c.Config().ServerConf.ServerURL,
			url.PathEscape(cluster.Name),
			release.Namespace,
			rel.Name,
		) + fmt.Sprintf("?project_id=%d", release.ProjectID),
	}

	rel, err = helmAgent.UpgradeReleaseByValues(conf, c.Config().DOConf)

	if err != nil {
		notifyOpts.Status = slack.StatusFailed
		notifyOpts.Info = err.Error()

		notifier.Notify(notifyOpts)

		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			err,
			http.StatusBadRequest,
		))

		return
	}

	notifyOpts.Status = string(rel.Info.Status)
	notifyOpts.Version = rel.Version

	notifier.Notify(notifyOpts)
}
