package stack

import (
	"context"
	"fmt"
	"os"
	"strconv"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

type GitHubMetadata struct {
	Repo, RepoOwner, BranchFrom, PRName string
}

type EnvironmentMeta struct {
	EnvironmentConfigID uint           `json:"environment_config_id"`
	Namespace           string         `json:"namespace"`
	GitHubMetadata      GitHubMetadata `json:"github_metadata"`
}

func HandleEnvironmentConfiguration(
	client *api.Client,
	cliConf *config.CLIConfig,
	applicationName string,
) (string, EnvironmentMeta, error) {
	var namespace string
	envMeta := EnvironmentMeta{}

	environmentConfigID := os.Getenv("PORTER_ENVIRONMENT_ID")
	if environmentConfigID != "" {
		eci, err := strconv.Atoi(environmentConfigID)
		if err != nil {
			return "", envMeta, fmt.Errorf("unable to parse PORTER_ENVIRONMENT_ID: %w", err)
		}

		ghMeta, err := getGitDeployMeta()
		if err != nil {
			return "", envMeta, fmt.Errorf("unable to deploy to environmet: %w", err)
		}

		envConf, err := client.GetEnvironmentConfig(context.Background(), cliConf.Project, cliConf.Cluster, uint(eci))

		if err != nil {
			return "", envMeta, fmt.Errorf("unable to read environment config from DB: %w", err)
		}

		namespace = formatNamespaceForEnvironment(envConf.Name, ghMeta.RepoOwner, ghMeta.Repo, ghMeta.BranchFrom)

		envMeta.EnvironmentConfigID = uint(eci)
		envMeta.Namespace = namespace
		envMeta.GitHubMetadata = ghMeta
	} else {
		namespace = fmt.Sprintf("porter-stack-%s", applicationName)
	}

	return namespace, envMeta, nil
}

func formatNamespaceForEnvironment(envName, repoOwner, repo, branch string) string {
	return fmt.Sprintf("porter-env-%s-%s-%s-%s", envName, repoOwner, repo, branch)
}

func getGitDeployMeta() (GitHubMetadata, error) {
	ghMeta := GitHubMetadata{}

	branchFrom := os.Getenv("PORTER_BRANCH_FROM")
	if branchFrom == "" {
		return ghMeta, fmt.Errorf("PORTER_BRANCH_FROM not set")
	}
	ghMeta.BranchFrom = branchFrom

	repoName := os.Getenv("PORTER_REPO_NAME")
	if repoName == "" {
		return ghMeta, fmt.Errorf("PORTER_REPO_NAME not set")
	}
	ghMeta.Repo = repoName

	repoOwner := os.Getenv("PORTER_REPO_OWNER")
	if repoOwner == "" {
		return ghMeta, fmt.Errorf("PORTER_REPO_OWNER not set")
	}
	ghMeta.RepoOwner = repoOwner

	prName := os.Getenv("PORTER_PR_NAME")
	if prName == "" {
		return ghMeta, fmt.Errorf("PORTER_PR_NAME not set")
	}
	ghMeta.PRName = prName

	return ghMeta, nil
}
