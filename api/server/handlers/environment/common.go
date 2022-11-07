package environment

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

var (
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

func validateGetDeploymentRequest(
	projectID, clusterID, envID uint,
	owner, name string,
	request *types.GetDeploymentRequest,
	repo repository.Repository,
) (*models.Deployment, apierrors.RequestError) {
	if request.PRNumber == 0 && request.DeploymentID == 0 && request.Namespace == "" {
		return nil, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("one of id, pr_number or namespace must be present in request body"), http.StatusBadRequest,
		)
	}

	var depl *models.Deployment
	var err error

	// read the deployment
	if request.DeploymentID != 0 {
		depl, err = repo.Environment().ReadDeploymentByID(projectID, clusterID, request.DeploymentID)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, apierrors.NewErrNotFound(errDeploymentNotFound)
			}

			return nil, apierrors.NewErrInternal(err)
		}
	} else if request.PRNumber != 0 {
		depl, err = repo.Environment().ReadDeploymentByGitDetails(envID, owner, name, request.PRNumber)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, apierrors.NewErrNotFound(errDeploymentNotFound)
			}

			return nil, apierrors.NewErrInternal(err)
		}
	} else if request.Namespace != "" {
		depl, err = repo.Environment().ReadDeployment(envID, request.Namespace)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, apierrors.NewErrNotFound(errDeploymentNotFound)
			}

			return nil, apierrors.NewErrInternal(err)
		}
	}

	if depl == nil {
		return nil, apierrors.NewErrNotFound(errDeploymentNotFound)
	}

	return depl, nil
}
