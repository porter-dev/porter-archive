package webhook

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/models"
)

type GithubIncomingWebhookHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGithubIncomingWebhookHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubIncomingWebhookHandler {
	return &GithubIncomingWebhookHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *GithubIncomingWebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	payload, err := github.ValidatePayload(r, []byte(c.Config().ServerConf.GithubIncomingWebhookSecret))
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	event, err := github.ParseWebHook(github.WebHookType(r), payload)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	switch event := event.(type) {
	case *github.PullRequestEvent:
		err = c.processPullRequestEvent(event, r)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}

func (c *GithubIncomingWebhookHandler) processPullRequestEvent(event *github.PullRequestEvent, r *http.Request) error {
	owner := event.GetOrganization().GetName()
	repo := event.GetRepo().GetName()

	env, err := c.Repo().Environment().ReadEnvironmentByOwnerRepoName(owner, repo)

	if err != nil {
		return err
	}

	// create deployment on GitHub API
	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		return err
	}

	if env.Mode == "auto" && event.GetAction() == "opened" {
		_, err := client.Actions.CreateWorkflowDispatchEventByFileName(
			r.Context(), owner, repo, fmt.Sprintf("porter_%s_env.yml", env.Name),
			github.CreateWorkflowDispatchEventRequest{
				Ref: event.PullRequest.GetHead().GetRef(),
				Inputs: map[string]interface{}{
					"pr_number":      event.PullRequest.GetNumber(),
					"pr_title":       event.PullRequest.GetTitle(),
					"pr_branch_from": event.PullRequest.GetHead().GetRef(),
					"pr_branch_into": event.PullRequest.GetBase().GetRef(),
				},
			},
		)

		if err != nil {
			return err
		}
	} else if event.GetAction() == "synchronize" {
		depl, err := c.Repo().Environment().ReadDeploymentByGitDetails(
			env.ID, owner, repo, uint(event.GetPullRequest().GetNumber()),
		)

		if err != nil {
			return err
		}

		if depl.Status != "disabled" {
			_, err := client.Actions.CreateWorkflowDispatchEventByFileName(
				r.Context(), owner, repo, fmt.Sprintf("porter_%s_env.yml", env.Name),
				github.CreateWorkflowDispatchEventRequest{
					Ref: event.PullRequest.GetHead().GetRef(),
					Inputs: map[string]interface{}{
						"pr_number":      event.PullRequest.GetNumber(),
						"pr_title":       event.PullRequest.GetTitle(),
						"pr_branch_from": event.PullRequest.GetHead().GetRef(),
						"pr_branch_into": event.PullRequest.GetBase().GetRef(),
					},
				},
			)

			if err != nil {
				return err
			}
		}
	}

	return nil
}

func getGithubClientFromEnvironment(config *config.Config, env *models.Environment) (*github.Client, error) {
	// get the github app client
	ghAppId, err := strconv.Atoi(config.ServerConf.GithubAppID)

	if err != nil {
		return nil, err
	}

	// authenticate as github app installation
	itr, err := ghinstallation.NewKeyFromFile(
		http.DefaultTransport,
		int64(ghAppId),
		int64(env.GitInstallationID),
		config.ServerConf.GithubAppSecretPath,
	)

	if err != nil {
		return nil, err
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}
