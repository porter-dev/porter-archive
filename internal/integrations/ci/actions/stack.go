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
}

func OpenGithubPR(opts *GithubPROpts) error {
	// get the repository to find the default branch
	repo, _, err := opts.Client.Repositories.Get(
		context.TODO(),
		opts.GitRepoOwner,
		opts.GitRepoName,
	)
	if err != nil {
		return err
	}

	defaultBranch := repo.GetDefaultBranch()

	err = createNewBranch(opts.Client,
		opts.GitRepoOwner,
		opts.GitRepoName,
		defaultBranch,
		"porter-stack")

	if err != nil {
		return fmt.Errorf(
			"Unable to create PR to merge workflow files into protected branch: %s.\n"+
				"To enable Porter Preview Environment deployments, please create Github workflow "+
				"files in this branch with the following contents:\n"+
				"--------\n%s--------\nERROR: %w",
			defaultBranch, string(applyWorkflowYAML), ErrCreatePRForProtectedBranch,
		)
	}

	_, err = commitWorkflowFile(
		opts.Client,
		fmt.Sprintf("porter_%s_env.yml", strings.ToLower(opts.EnvironmentName)),
		applyWorkflowYAML, opts.GitRepoOwner,
		opts.GitRepoName, "porter-preview", false,
	)

	if err != nil {
		return fmt.Errorf(
			"Unable to create PR to merge workflow files into protected branch: %s.\n"+
				"To enable Porter Preview Environment deployments, please create Github workflow "+
				"files in this branch with the following contents:\n"+
				"--------\n%s--------\nERROR: %w",
			defaultBranch, string(applyWorkflowYAML), ErrCreatePRForProtectedBranch,
		)
	}

	pr, _, err := opts.Client.PullRequests.Create(
		context.Background(), opts.GitRepoOwner, opts.GitRepoName, &github.NewPullRequest{
			Title: github.String("Enable Porter Preview Environment deployments"),
			Base:  github.String(defaultBranch),
			Head:  github.String("porter-preview"),
		},
	)
	if err != nil {
		return err
	}
	return nil
}

func GetStackApplyActionYAML(opts *EnvOpts) ([]byte, error) {
	gaSteps := []GithubActionYAMLStep{
		getCheckoutCodeStep(),
		getSetTagStep(),
		getDeployStackStep(
			opts.ServerURL,
			getPreviewEnvSecretName(opts.ProjectID, opts.ClusterID, opts.InstanceName),
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
					opts.Branch,
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
