package webhook

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"sync"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
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
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error validating webhook payload: %w", err)))
		return
	}

	event, err := github.ParseWebHook(github.WebHookType(r), payload)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error parsing webhook: %w", err)))
		return
	}

	switch event := event.(type) {
	case *github.PullRequestEvent:
		err = c.processPullRequestEvent(event, r)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error processing pull request webhook event: %w", err)))
			return
		}
	}
}

func (c *GithubIncomingWebhookHandler) processPullRequestEvent(event *github.PullRequestEvent, r *http.Request) error {
	// get the webhook id from the request
	webhookID, reqErr := requestutils.GetURLParamString(r, types.URLParamIncomingWebhookID)

	if reqErr != nil {
		return fmt.Errorf(reqErr.Error())
	}

	owner := event.GetRepo().GetOwner().GetLogin()
	repo := event.GetRepo().GetName()

	env, err := c.Repo().Environment().ReadEnvironmentByWebhookIDOwnerRepoName(webhookID, owner, repo)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}

		return fmt.Errorf("[webhookID: %s, owner: %s, repo: %s] error reading environment: %w", webhookID, owner, repo, err)
	}

	if event.GetPullRequest() == nil {
		return fmt.Errorf("[webhookID: %s, owner: %s, repo: %s] incoming webhook does not have pull request information: %w",
			webhookID, owner, repo, err)
	}

	envType := env.ToEnvironmentType()

	if len(envType.GitRepoBranches) > 0 {
		found := false

		for _, br := range envType.GitRepoBranches {
			if br == event.GetPullRequest().GetHead().GetRef() {
				found = true
				break
			}
		}

		if !found {
			return nil
		}
	}

	// create deployment on GitHub API
	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		return fmt.Errorf("[webhookID: %s, owner: %s, repo: %s, environmentID: %d, prNumber: %d] "+
			"error getting github client: %w", webhookID, owner, repo, env.ID, event.GetPullRequest().GetNumber(), err)
	}

	if env.Mode == "auto" && event.GetAction() == "opened" {
		depl := &models.Deployment{
			EnvironmentID: env.ID,
			Namespace:     "",
			Status:        types.DeploymentStatusCreating,
			PullRequestID: uint(event.GetPullRequest().GetNumber()),
			PRName:        event.GetPullRequest().GetTitle(),
			RepoName:      repo,
			RepoOwner:     owner,
			CommitSHA:     event.GetPullRequest().GetHead().GetSHA()[:7],
			PRBranchFrom:  event.GetPullRequest().GetHead().GetRef(),
			PRBranchInto:  event.GetPullRequest().GetBase().GetRef(),
		}

		_, err = c.Repo().Environment().CreateDeployment(depl)

		if err != nil {
			return fmt.Errorf("[webhookID: %s, owner: %s, repo: %s, environmentID: %d, prNumber: %d] "+
				"error creating new deployment: %w", webhookID, owner, repo, env.ID, event.GetPullRequest().GetNumber(), err)
		}

		_, err := client.Actions.CreateWorkflowDispatchEventByFileName(
			r.Context(), owner, repo, fmt.Sprintf("porter_%s_env.yml", env.Name),
			github.CreateWorkflowDispatchEventRequest{
				Ref: event.GetPullRequest().GetHead().GetRef(),
				Inputs: map[string]interface{}{
					"pr_number":      strconv.FormatUint(uint64(event.GetPullRequest().GetNumber()), 10),
					"pr_title":       event.GetPullRequest().GetTitle(),
					"pr_branch_from": event.GetPullRequest().GetHead().GetRef(),
					"pr_branch_into": event.GetPullRequest().GetBase().GetRef(),
				},
			},
		)

		if err != nil {
			return fmt.Errorf("[webhookID: %s, owner: %s, repo: %s, environmentID: %d, prNumber: %d] "+
				"error creating workflow dispatch event: %w", webhookID, owner, repo, env.ID, event.GetPullRequest().GetNumber(), err)
		}
	} else if event.GetAction() == "synchronize" || event.GetAction() == "closed" || event.GetAction() == "edited" {
		depl, err := c.Repo().Environment().ReadDeploymentByGitDetails(
			env.ID, owner, repo, uint(event.GetPullRequest().GetNumber()),
		)

		if err != nil {
			return fmt.Errorf("[webhookID: %s, owner: %s, repo: %s, environmentID: %d, prNumber: %d] "+
				"error reading deployment: %w", webhookID, owner, repo, env.ID, event.GetPullRequest().GetNumber(), err)
		}

		if depl.Status == types.DeploymentStatusInactive {
			return nil
		}

		if event.GetAction() == "synchronize" {
			_, err := client.Actions.CreateWorkflowDispatchEventByFileName(
				r.Context(), owner, repo, fmt.Sprintf("porter_%s_env.yml", env.Name),
				github.CreateWorkflowDispatchEventRequest{
					Ref: event.GetPullRequest().GetHead().GetRef(),
					Inputs: map[string]interface{}{
						"pr_number":      strconv.FormatUint(uint64(event.GetPullRequest().GetNumber()), 10),
						"pr_title":       event.GetPullRequest().GetTitle(),
						"pr_branch_from": event.GetPullRequest().GetHead().GetRef(),
						"pr_branch_into": event.GetPullRequest().GetBase().GetRef(),
					},
				},
			)

			if err != nil {
				return fmt.Errorf("[webhookID: %s, owner: %s, repo: %s, environmentID: %d, deploymentID: %d, prNumber: %d] "+
					"error creating workflow dispatch event: %w", webhookID, owner, repo, env.ID, depl.ID,
					event.GetPullRequest().GetNumber(), err)
			}
		} else if event.GetAction() == "closed" {
			// check for already running workflows we should be cancelling
			var wg sync.WaitGroup
			statuses := []string{"in_progress", "queued", "requested", "waiting"}
			chanErr := fmt.Errorf("")

			wg.Add(len(statuses))

			for _, status := range statuses {
				go func(status string) {
					defer wg.Done()

					runs, _, err := client.Actions.ListWorkflowRunsByFileName(
						context.Background(), owner, repo, fmt.Sprintf("porter_%s_env.yml", env.Name),
						&github.ListWorkflowRunsOptions{
							Branch: event.GetPullRequest().GetHead().GetRef(),
							Status: status,
						},
					)

					if err == nil {
						for _, run := range runs.WorkflowRuns {
							resp, err := client.Actions.CancelWorkflowRunByID(context.Background(), owner, repo, run.GetID())

							if err != nil && resp.StatusCode != http.StatusAccepted {
								// the go library we are using returns a 202 Accepted status as an error
								// in this case, we should rule this out as an error
								chanErr = fmt.Errorf("%s: error cancelling %s: %w", chanErr.Error(), run.GetHTMLURL(), err)
							}
						}
					} else {
						chanErr = fmt.Errorf("%s: error listing workflows for status %s: %w", chanErr.Error(), status, err)
					}
				}(status)
			}

			wg.Wait()

			err = c.deleteDeployment(r, depl, env, client)

			if err != nil {
				deleteErr := fmt.Errorf("[webhookID: %s, owner: %s, repo: %s, environmentID: %d, deploymentID: %d, prNumber: %d] "+
					"error deleting deployment: %w", webhookID, owner, repo, env.ID, depl.ID, event.GetPullRequest().GetNumber(), err)

				if chanErr.Error() != "" {
					deleteErr = fmt.Errorf("%s. errors found while trying to cancel active workflow runs %w", deleteErr.Error(), chanErr)
				}

				return deleteErr
			} else if chanErr.Error() != "" {
				return fmt.Errorf("[webhookID: %s, owner: %s, repo: %s, environmentID: %d, deploymentID: %d, prNumber: %d] "+
					"deployment deleted but errors found while trying to cancel active workflow runs %w", webhookID, owner, repo, env.ID, depl.ID,
					event.GetPullRequest().GetNumber(), chanErr)
			}
		} else if event.GetChanges() != nil {
			shouldUpdate := false

			if event.GetChanges().GetTitle() != nil && event.GetPullRequest().GetTitle() != depl.PRName {
				depl.PRName = event.GetPullRequest().GetTitle()
				shouldUpdate = true
			}

			if event.GetChanges().GetBase() != nil && event.GetChanges().GetBase().GetRef() != nil && event.GetPullRequest().GetBase().GetRef() != depl.PRBranchInto {
				depl.PRBranchInto = event.GetPullRequest().GetBase().GetRef()
				shouldUpdate = true
			}

			if shouldUpdate {
				_, err := c.Repo().Environment().UpdateDeployment(depl)

				if err != nil {
					return fmt.Errorf("[webhookID: %s, owner: %s, repo: %s, environmentID: %d, deploymentID: %d, prNumber: %d] "+
						"error updating deployment to reflect changes in the pull request %w", webhookID, owner, repo, env.ID, depl.ID,
						event.GetPullRequest().GetNumber(), err)
				}
			}
		}
	}

	return nil
}

func (c *GithubIncomingWebhookHandler) deleteDeployment(
	r *http.Request,
	depl *models.Deployment,
	env *models.Environment,
	client *github.Client,
) error {
	cluster, err := c.Repo().Cluster().ReadCluster(env.ProjectID, env.ClusterID)

	if err != nil {
		return fmt.Errorf("[projectID: %d, clusterID: %d] error reading cluster when deleting existing deployment: %w",
			env.ProjectID, env.ClusterID, err)
	}

	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		return err
	}

	// make sure we do not delete any kubernetes "system" namespaces
	if !isSystemNamespace(depl.Namespace) {
		err = agent.DeleteNamespace(depl.Namespace)

		if err != nil {
			return fmt.Errorf("[owner: %s, repo: %s, environmentID: %d, deploymentID: %d] error deleting namespace '%s': %w",
				env.GitRepoOwner, env.GitRepoName, env.ID, depl.ID, depl.Namespace, err)
		}
	}

	// Create new deployment status to indicate deployment is ready
	state := "inactive"

	deploymentStatusRequest := github.DeploymentStatusRequest{
		State: &state,
	}

	client.Repositories.CreateDeploymentStatus(
		context.Background(),
		env.GitRepoOwner,
		env.GitRepoName,
		depl.GHDeploymentID,
		&deploymentStatusRequest,
	)

	_, err = c.Repo().Environment().DeleteDeployment(depl)

	if err != nil {
		return fmt.Errorf("[owner: %s, repo: %s, environmentID: %d, deploymentID: %d] error updating deployment: %w",
			env.GitRepoOwner, env.GitRepoName, env.ID, depl.ID, err)
	}

	return nil
}

func isSystemNamespace(namespace string) bool {
	return namespace == "cert-manager" || namespace == "ingress-nginx" ||
		namespace == "kube-node-lease" || namespace == "kube-public" ||
		namespace == "kube-system" || namespace == "monitoring" ||
		namespace == "porter-agent-system" || namespace == "default" ||
		namespace == "ingress-nginx-private"
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
