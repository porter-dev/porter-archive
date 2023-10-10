package webhook

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"connectrpc.com/connect"
	"github.com/google/go-github/v39/github"
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
	"github.com/porter-dev/porter/internal/porter_app"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GithubPRStatus_Closed is the status for a closed PR (closed, merged)
const GithubPRStatus_Closed = "closed"

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

	webhookID, reqErr := requestutils.GetURLParamString(r, types.URLParamWebhookID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "webhook-id", Value: webhookID})

	webhookUUID, err := uuid.Parse(webhookID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing webhook id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if webhookUUID == uuid.Nil {
		err := telemetry.Error(ctx, span, err, "webhook id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	webhook, err := c.Repo().GithubWebhook().Get(ctx, webhookUUID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting github webhook")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if webhook.ID == uuid.Nil {
		err := telemetry.Error(ctx, span, err, "github webhook id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-id", Value: webhook.PorterAppID},
		telemetry.AttributeKV{Key: "cluster-id", Value: webhook.ClusterID},
		telemetry.AttributeKV{Key: "project-id", Value: webhook.ProjectID},
	)

	porterApp, err := c.Repo().PorterApp().ReadPorterApp(ctx, uint(webhook.PorterAppID))
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting porter app")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if porterApp.ID == 0 {
		err := telemetry.Error(ctx, span, err, "porter app not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if porterApp.ProjectID != uint(webhook.ProjectID) {
		err := telemetry.Error(ctx, span, err, "porter app project id does not match")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	switch event := event.(type) {
	case *github.PullRequestEvent:
		if event.GetAction() != GithubPRStatus_Closed {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "event-processed", Value: false})
			c.WriteResult(w, r, nil)
			return
		}

		branch := event.GetPullRequest().GetHead().GetRef()
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "event-branch", Value: branch})

		err = cancelPendingWorkflows(ctx, cancelPendingWorkflowsInput{
			appName:         porterApp.Name,
			repoID:          porterApp.GitRepoID,
			repoName:        porterApp.RepoName,
			githubAppSecret: c.Config().ServerConf.GithubAppSecret,
			githubAppID:     c.Config().ServerConf.GithubAppID,
			event:           event,
		})
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error cancelling pending workflows")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		deploymentTarget, err := c.Repo().DeploymentTarget().DeploymentTargetBySelectorAndSelectorType(
			uint(webhook.ProjectID),
			uint(webhook.ClusterID),
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

		if deploymentTarget.ClusterID != webhook.ClusterID {
			err := telemetry.Error(ctx, span, err, "deployment target cluster id does not match")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		deleteTargetReq := connect.NewRequest(&porterv1.DeleteDeploymentTargetRequest{
			ProjectId:          int64(webhook.ProjectID),
			DeploymentTargetId: deploymentTarget.ID.String(),
		})

		_, err = c.Config().ClusterControlPlaneClient.DeleteDeploymentTarget(ctx, deleteTargetReq)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error deleting deployment target")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "event-processed", Value: true})
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pr-id", Value: event.GetPullRequest().GetID()})
	}

	c.WriteResult(w, r, nil)
}

type cancelPendingWorkflowsInput struct {
	appName         string
	repoID          uint
	repoName        string
	githubAppSecret []byte
	githubAppID     string
	event           *github.PullRequestEvent
}

func cancelPendingWorkflows(ctx context.Context, inp cancelPendingWorkflowsInput) error {
	ctx, span := telemetry.NewSpan(ctx, "cancel-pending-workflows")
	defer span.End()

	if inp.repoID == 0 {
		return telemetry.Error(ctx, span, nil, "repo id is 0")
	}
	if inp.repoName == "" {
		return telemetry.Error(ctx, span, nil, "repo name is empty")
	}
	if inp.appName == "" {
		return telemetry.Error(ctx, span, nil, "app name is empty")
	}
	if inp.githubAppSecret == nil {
		return telemetry.Error(ctx, span, nil, "github app secret is nil")
	}
	if inp.githubAppID == "" {
		return telemetry.Error(ctx, span, nil, "github app id is empty")
	}

	client, err := porter_app.GetGithubClientByRepoID(ctx, inp.repoID, inp.githubAppSecret, inp.githubAppID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error getting github client")
	}

	repoDetails := strings.Split(inp.repoName, "/")
	if len(repoDetails) != 2 {
		return telemetry.Error(ctx, span, nil, "repo name is invalid")
	}
	owner := repoDetails[0]
	repo := repoDetails[1]

	pendingStatusOptions := []string{"in_progress", "queued", "requested", "waiting"}
	for _, status := range pendingStatusOptions {
		runs, _, err := client.Actions.ListWorkflowRunsByFileName(
			ctx, owner, repo, fmt.Sprintf("porter_preview_%s.yml", inp.appName),
			&github.ListWorkflowRunsOptions{
				Branch: inp.event.GetPullRequest().GetHead().GetRef(),
				Status: status,
			},
		)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error listing workflow runs")
		}

		for _, run := range runs.WorkflowRuns {
			_, err := client.Actions.CancelWorkflowRunByID(
				ctx, owner, repo, run.GetID(),
			)
			if err != nil {
				return telemetry.Error(ctx, span, err, "error cancelling workflow run")
			}
		}
	}

	return nil
}
