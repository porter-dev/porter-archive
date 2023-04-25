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
	PorterToken               string
	ServerURL                 string
	DefaultBranch             string
}

type GetStackApplyActionYAMLOpts struct {
	ServerURL            string
	StackName            string
	ProjectID, ClusterID uint
	DefaultBranch        string
	SecretName           string
}

func OpenGithubPR(opts *GithubPROpts) error {
	// create porter secret
	secretName := fmt.Sprintf("PORTER_STACK_%d_%d", opts.ProjectID, opts.ClusterID)
	err := createGithubSecret(
		opts.Client,
		secretName,
		opts.PorterToken,
		opts.GitRepoOwner,
		opts.GitRepoName,
	)
	if err != nil {
		return err
	}

	applyWorkflowYAML, err := getStackApplyActionYAML(&GetStackApplyActionYAMLOpts{
		ServerURL:     opts.ServerURL,
		ClusterID:     opts.ClusterID,
		ProjectID:     opts.ProjectID,
		StackName:     opts.StackName,
		DefaultBranch: opts.DefaultBranch,
		SecretName:    secretName,
	})
	if err != nil {
		return err
	}

	err = createNewBranch(opts.Client,
		opts.GitRepoOwner,
		opts.GitRepoName,
		opts.DefaultBranch,
		"porter-stack")
	if err != nil {
		return fmt.Errorf(
			"Unable to create PR to merge workflow files into protected branch: %s.\n"+
				"To enable Porter Preview Environment deployments, please create Github workflow "+
				"files in this branch with the following contents:\n"+
				"--------\n%s--------\nERROR: %w",
			opts.DefaultBranch, string(applyWorkflowYAML), ErrCreatePRForProtectedBranch,
		)
	}

	_, err = commitWorkflowFile(
		opts.Client,
		fmt.Sprintf("porter_stack_%s.yml", strings.ToLower(opts.StackName)),
		applyWorkflowYAML, opts.GitRepoOwner,
		opts.GitRepoName, "porter-preview", false,
	)

	if err != nil {
		return fmt.Errorf(
			"Unable to create PR to merge workflow files into protected branch: %s.\n"+
				"To enable Porter Preview Environment deployments, please create Github workflow "+
				"files in this branch with the following contents:\n"+
				"--------\n%s--------\nERROR: %w",
			opts.DefaultBranch, string(applyWorkflowYAML), ErrCreatePRForProtectedBranch,
		)
	}

	_, _, err = opts.Client.PullRequests.Create(
		context.Background(), opts.GitRepoOwner, opts.GitRepoName, &github.NewPullRequest{
			Title: github.String("Enable Porter Preview Environment deployments"),
			Base:  github.String(opts.DefaultBranch),
			Head:  github.String("porter-preview"),
		},
	)
	if err != nil {
		return err
	}
	return nil
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
