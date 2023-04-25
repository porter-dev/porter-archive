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
}

func OpenGithubPR(opts GithubPROpts) error {
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

func getStackApplyActionYAML(opts *EnvOpts) ([]byte, error) {
	gaSteps := []GithubActionYAMLStep{
		getCheckoutCodeStep(),
		getCreatePreviewEnvStep(
			opts.ServerURL,
			getPreviewEnvSecretName(opts.ProjectID, opts.ClusterID, opts.InstanceName),
			opts.ProjectID,
			opts.ClusterID,
			opts.GitInstallationID,
			opts.GitRepoOwner,
			opts.GitRepoName,
			"v0.2.1",
		),
	}

	actionYAML := GithubActionYAML{
		On: map[string]interface{}{
			"workflow_dispatch": map[string]interface{}{
				"inputs": map[string]interface{}{
					"pr_number": map[string]interface{}{
						"description": "Pull request number",
						"type":        "string",
						"required":    true,
					},
					"pr_title": map[string]interface{}{
						"description": "Pull request title",
						"type":        "string",
						"required":    true,
					},
					"pr_branch_from": map[string]interface{}{
						"description": "Pull request head branch",
						"type":        "string",
						"required":    true,
					},
					"pr_branch_into": map[string]interface{}{
						"description": "Pull request base branch",
						"type":        "string",
						"required":    true,
					},
				},
			},
		},
		Name: "Porter Preview Environment",
		Jobs: map[string]GithubActionYAMLJob{
			"porter-preview": {
				RunsOn: "ubuntu-latest",
				Concurrency: map[string]string{
					"group": "${{ github.workflow }}-${{ github.event.inputs.pr_number }}",
				},
				Steps: gaSteps,
			},
		},
	}

	return yaml.Marshal(actionYAML)
}
