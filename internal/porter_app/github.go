package porter_app

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v39/github"
	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// CreateAppWebhookInput is the input to the CreateAppWebhook function
type CreateAppWebhookInput struct {
	ProjectID           uint
	ClusterID           uint
	PorterAppName       string
	GithubAppSecret     []byte
	GithubAppID         string
	GithubWebhookSecret string
	ServerURL           string

	PorterAppRepository     repository.PorterAppRepository
	GithubWebhookRepository repository.GithubWebhookRepository
}

// CreateAppWebhook creates or updates a github webhook for a porter app associated with a given project / cluster / app
// The webhook watches for pull request and push events, used for managing preview environments
func CreateAppWebhook(ctx context.Context, inp CreateAppWebhookInput) error {
	ctx, span := telemetry.NewSpan(ctx, "porter-app-create-app-webhook")
	defer span.End()

	if inp.PorterAppName == "" {
		return telemetry.Error(ctx, span, nil, "porter app name is empty")
	}
	if inp.ProjectID == 0 {
		return telemetry.Error(ctx, span, nil, "project id is empty")
	}
	if inp.ClusterID == 0 {
		return telemetry.Error(ctx, span, nil, "cluster id is empty")
	}
	if inp.GithubAppSecret == nil {
		return telemetry.Error(ctx, span, nil, "github app secret is nil")
	}
	if inp.GithubAppID == "" {
		return telemetry.Error(ctx, span, nil, "github app id is empty")
	}
	if inp.GithubWebhookSecret == "" {
		return telemetry.Error(ctx, span, nil, "github webhook secret is empty")
	}
	if inp.PorterAppRepository == nil {
		return telemetry.Error(ctx, span, nil, "porter app repository is nil")
	}
	if inp.GithubWebhookRepository == nil {
		return telemetry.Error(ctx, span, nil, "github webhook repository is nil")
	}

	porterApp, err := inp.PorterAppRepository.ReadPorterAppByName(inp.ClusterID, inp.PorterAppName)
	if err != nil {
		return telemetry.Error(ctx, span, err, "could not read porter app by name")
	}
	if porterApp.ID == 0 {
		return telemetry.Error(ctx, span, nil, "porter app not found")
	}
	if porterApp.GitRepoID == 0 {
		return telemetry.Error(ctx, span, nil, "porter app git repo id is empty")
	}

	githubClient, err := GetGithubClientByRepoID(ctx, porterApp.GitRepoID, inp.GithubAppSecret, inp.GithubAppID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error creating github client")
	}

	repoDetails := strings.Split(porterApp.RepoName, "/")
	if len(repoDetails) != 2 {
		return telemetry.Error(ctx, span, nil, "repo name is not in the format <org>/<repo>")
	}
	if _, _, err := githubClient.Repositories.Get(ctx, repoDetails[0], repoDetails[1]); err != nil {
		return telemetry.Error(ctx, span, err, "error getting github repo")
	}

	hook := &github.Hook{
		Config: map[string]interface{}{
			"content_type": "json",
			"secret":       inp.GithubWebhookSecret,
		},
		Events: []string{"pull_request", "push"},
		Active: github.Bool(true),
	}

	// check if the webhook already exists
	webhook, err := inp.GithubWebhookRepository.GetByClusterAndAppID(ctx, inp.ClusterID, porterApp.ID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error getting github webhook")
	}

	if webhook.ID != uuid.Nil {
		hook.Config["url"] = fmt.Sprintf("%s/api/webhooks/github/%s", inp.ServerURL, webhook.ID.String())
		_, _, err := githubClient.Repositories.EditHook(ctx, repoDetails[0], repoDetails[1], webhook.GithubWebhookID, hook)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error editing github webhook")
		}

		return nil
	}

	webhookID := uuid.New()

	hook.Config["url"] = fmt.Sprintf("%s/api/webhooks/github/%s", inp.ServerURL, webhookID)
	hook, _, err = githubClient.Repositories.CreateHook(ctx, repoDetails[0], repoDetails[1], hook)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error creating github webhook")
	}

	webhook = &models.GithubWebhook{
		ID:              webhookID,
		ProjectID:       int(porterApp.ProjectID),
		ClusterID:       int(porterApp.ClusterID),
		PorterAppID:     int(porterApp.ID),
		GithubWebhookID: hook.GetID(),
	}

	_, err = inp.GithubWebhookRepository.Insert(ctx, webhook)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error saving github webhook")
	}

	return nil
}

// GetGithubClientByRepoID creates a github client for a given repo id
func GetGithubClientByRepoID(ctx context.Context, repoID uint, githubAppSecret []byte, githubAppID string) (*github.Client, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-github-client-by-repo-id")
	defer span.End()

	if githubAppSecret == nil {
		return nil, telemetry.Error(ctx, span, nil, "github app secret is nil")
	}
	if githubAppID == "" {
		return nil, telemetry.Error(ctx, span, nil, "github app id is empty")
	}

	appID, err := strconv.Atoi(githubAppID)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "could not convert github app id to int")
	}

	itr, err := ghinstallation.New(
		http.DefaultTransport,
		int64(appID),
		int64(repoID),
		githubAppSecret,
	)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "could not create github app client")
	}
	if itr == nil {
		return nil, telemetry.Error(ctx, span, nil, "github app client is nil")
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}
