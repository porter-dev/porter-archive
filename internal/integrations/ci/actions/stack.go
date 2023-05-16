package actions

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/go-github/v41/github"
	"gopkg.in/yaml.v2"
)

type GithubPROpts struct {
	Client                    *github.Client
	GitRepoOwner, GitRepoName string
	ApplyWorkflowYAML         string
	StackName                 string
	ProjectID, ClusterID      uint
	ServerURL                 string
	DefaultBranch             string
	SecretName                string
	PorterYamlPath            string
	Body                      string
}

type GetStackApplyActionYAMLOpts struct {
	ServerURL            string
	StackName            string
	ProjectID, ClusterID uint
	DefaultBranch        string
	SecretName           string
	PorterYamlPath       string
}

func OpenGithubPR(opts *GithubPROpts) (*github.PullRequest, error) {
	var pr *github.PullRequest
	applyWorkflowYAML, err := getStackApplyActionYAML(&GetStackApplyActionYAMLOpts{
		ServerURL:      opts.ServerURL,
		ClusterID:      opts.ClusterID,
		ProjectID:      opts.ProjectID,
		StackName:      opts.StackName,
		DefaultBranch:  opts.DefaultBranch,
		SecretName:     opts.SecretName,
		PorterYamlPath: opts.PorterYamlPath,
	})
	if err != nil {
		return pr, err
	}

	prBranchName := "porter-stack"

	err = createNewBranch(opts.Client,
		opts.GitRepoOwner,
		opts.GitRepoName,
		opts.DefaultBranch,
		prBranchName)
	if err != nil {
		return pr, fmt.Errorf(
			"error creating branch: %w",
			err,
		)
	}

	_, err = commitWorkflowFile(
		opts.Client,
		fmt.Sprintf("porter_stack_%s.yml", strings.ToLower(opts.StackName)),
		applyWorkflowYAML, opts.GitRepoOwner,
		opts.GitRepoName, prBranchName, false,
	)

	if err != nil {
		return pr, fmt.Errorf(
			"error committing file: %w",
			err,
		)
	}

	pr, _, err = opts.Client.PullRequests.Create(
		context.Background(), opts.GitRepoOwner, opts.GitRepoName, &github.NewPullRequest{
			Title: github.String("Enable Porter Application"),
			Base:  github.String(opts.DefaultBranch),
			Head:  github.String(prBranchName),
			Body:  github.String(opts.Body),
		},
	)
	if err != nil {
		return pr, fmt.Errorf(
			"error creating PR: %w",
			err,
		)
	}
	return pr, nil
}

func getStackApplyActionYAML(opts *GetStackApplyActionYAMLOpts) ([]byte, error) {
	gaSteps := []GithubActionYAMLStep{
		getCheckoutCodeStep(),
		getSetTagStep(),
		getDeployStackStep(
			opts.ServerURL,
			opts.SecretName,
			opts.StackName,
			"v0.1.0",
			opts.PorterYamlPath,
			opts.ProjectID,
			opts.ClusterID,
		),
	}

	actionYAML := GithubActionYAML{
		On: GithubActionYAMLOnPush{
			Push: GithubActionYAMLOnPushBranches{
				Branches: []string{
					opts.DefaultBranch,
				},
			},
		},
		Name: "Deploy to Porter",
		Jobs: map[string]GithubActionYAMLJob{
			"porter-deploy": {
				RunsOn: "ubuntu-latest",
				Steps:  gaSteps,
			},
		},
	}

	return yaml.Marshal(actionYAML)
}
