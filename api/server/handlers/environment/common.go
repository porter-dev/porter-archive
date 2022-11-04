package environment

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/models"
)

var (
	errPreviewProjectDisabled = errors.New("preview environments are not enabled for this project")
	errPreviewClusterDisabled = errors.New("preview environments are not enabled for this cluster")

	errDeploymentNotFound  = errors.New("no such deployment exists")
	errEnvironmentNotFound = errors.New("no such environment exists")
	errGithubAPI           = errors.New("error communicating with the github API")
)

func getGithubClientFromEnvironment(config *config.Config, env *models.Environment) (*github.Client, error) {
	// get the github app client
	ghAppId, err := strconv.Atoi(config.ServerConf.GithubAppID)

	if err != nil {
		return nil, fmt.Errorf("malformed GITHUB_APP_ID in server configuration: %w", err)
	}

	// authenticate as github app installation
	itr, err := ghinstallation.New(
		http.DefaultTransport,
		int64(ghAppId),
		int64(env.GitInstallationID),
		config.ServerConf.GithubAppSecret,
	)

	if err != nil {
		return nil, fmt.Errorf("error in creating github client from preview environment: %w", err)
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}

func isSystemNamespace(namespace string) bool {
	return namespace == "cert-manager" || namespace == "ingress-nginx" ||
		namespace == "kube-node-lease" || namespace == "kube-public" ||
		namespace == "kube-system" || namespace == "monitoring" ||
		namespace == "porter-agent-system" || namespace == "default" ||
		namespace == "ingress-nginx-private"
}

func isGithubPRClosed(
	client *github.Client,
	owner, name string,
	prNumber int,
) (bool, error) {
	ghPR, _, err := client.PullRequests.Get(
		context.Background(), owner, name, prNumber,
	)

	if err != nil {
		return false, fmt.Errorf("%v: %w", errGithubAPI, err)
	}

	return ghPR.GetState() == "closed", nil
}
