package porter_app

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v39/github"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// SetRepoWebhookInput is the input to the SetRepoWebhook function
type SetRepoWebhookInput struct {
	PorterAppName       string
	ClusterID           uint
	GithubAppSecret     []byte
	GithubAppID         string
	GithubWebhookSecret string
	WebhookURL          string

	PorterAppRepository repository.PorterAppRepository
}

// SetRepoWebhook creates or updates a github webhook for a porter app associated with a given repo
// The webhook watches for pull request and push events, used for managing preview environments
func SetRepoWebhook(ctx context.Context, inp SetRepoWebhookInput) error {
	ctx, span := telemetry.NewSpan(ctx, "porter-app-set-repo-webhook")
	defer span.End()

	if inp.PorterAppName == "" {
		return telemetry.Error(ctx, span, nil, "porter app name is empty")
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

	githubClient, err := getGithubClientByRepoID(ctx, porterApp.GitRepoID, inp.GithubAppSecret, inp.GithubAppID)
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
			"url":          inp.WebhookURL,
			"content_type": "json",
			"secret":       inp.GithubWebhookSecret,
		},
		Events: []string{"pull_request", "push"},
		Active: github.Bool(true),
	}

	if porterApp.GithubWebhookID != 0 {
		_, _, err := githubClient.Repositories.EditHook(
			context.Background(), repoDetails[0], repoDetails[1], porterApp.GithubWebhookID, hook,
		)
		if err != nil {
			return telemetry.Error(ctx, span, err, "could not edit hook")
		}

		return nil
	}

	hook, _, err = githubClient.Repositories.CreateHook(
		context.Background(), repoDetails[0], repoDetails[1], hook,
	)
	if err != nil {
		return telemetry.Error(ctx, span, err, "could not create hook")
	}

	porterApp.GithubWebhookID = hook.GetID()

	_, err = inp.PorterAppRepository.UpdatePorterApp(porterApp)
	if err != nil {
		return telemetry.Error(ctx, span, err, "could not update porter app")
	}

	return nil
}

func getGithubClientByRepoID(ctx context.Context, repoID uint, githubAppSecret []byte, githubAppID string) (*github.Client, error) {
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
