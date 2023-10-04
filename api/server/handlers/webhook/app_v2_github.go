package webhook

import (
	"net/http"

	"connectrpc.com/connect"
	"github.com/google/go-github/v41/github"
	"github.com/google/uuid"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GithubWebhookHandler handles webhooks sent to /api/webhooks/github/{project_id}/{cluster_id}/{porter_app_name}
type GithubWebhookHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewGithubWebhookHandler returns a GithubWebhookHandler
func NewGithubWebhookHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubWebhookHandler {
	return &GithubWebhookHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP handles the webhook and deletes the deployment target if a PR has been closed
func (c *GithubWebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-github-webhook")
	defer span.End()

	payload, err := github.ValidatePayload(r, []byte(c.Config().ServerConf.GithubIncomingWebhookSecret))
	if err != nil {
		err := telemetry.Error(ctx, span, err, "could not validate payload")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	event, err := github.ParseWebHook(github.WebHookType(r), payload)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "could not parse webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "application-name", Value: appName})

	clusterID, reqErr := requestutils.GetURLParamUint(r, types.URLParamClusterID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing cluster id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	projectID, reqErr := requestutils.GetURLParamUint(r, types.URLParamProjectID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing project id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "project-id", Value: projectID})
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: clusterID})

	porterApps, err := c.Repo().PorterApp().ReadPorterAppsByProjectIDAndName(projectID, appName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting porter app from repo")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if len(porterApps) == 0 {
		err := telemetry.Error(ctx, span, err, "error getting porter app from repo")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if len(porterApps) > 1 {
		err := telemetry.Error(ctx, span, err, "multiple porter apps returned; unable to determine which one to use")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	app := porterApps[0]
	if app.ID == 0 {
		err := telemetry.Error(ctx, span, err, "porter app id is missing")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if app.ClusterID != clusterID {
		err := telemetry.Error(ctx, span, err, "porter app cluster id does not match")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-id", Value: app.ID})

	switch event := event.(type) {
	case *github.PullRequestEvent:
		if event.GetAction() != "closed" {
			c.WriteResult(w, r, nil)
			return
		}

		branch := event.GetPullRequest().GetHead().GetRef()
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "event-branch", Value: branch})

		deploymentTarget, err := c.Repo().DeploymentTarget().DeploymentTargetBySelectorAndSelectorType(
			projectID,
			clusterID,
			branch,
			string(models.DeploymentTargetSelectorType_Namespace),
		)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting deployment target")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		if deploymentTarget.ID == uuid.Nil || !deploymentTarget.Preview {
			c.WriteResult(w, r, nil)
			return
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTarget.ID.String()})

		if deploymentTarget.ClusterID != int(clusterID) {
			err := telemetry.Error(ctx, span, err, "deployment target cluster id does not match")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		deleteTargetReq := connect.NewRequest(&porterv1.DeleteDeploymentTargetRequest{
			ProjectId:          int64(projectID),
			DeploymentTargetId: deploymentTarget.ID.String(),
		})

		_, err = c.Config().ClusterControlPlaneClient.DeleteDeploymentTarget(ctx, deleteTargetReq)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error deleting deployment target")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	c.WriteResult(w, r, nil)
}
