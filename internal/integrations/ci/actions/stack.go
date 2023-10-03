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
	DeleteWorkflowFilename    string
	PreviewWorkflowFilename   string
}

type GetStackApplyActionYAMLOpts struct {
	ServerURL            string
	StackName            string
	ProjectID, ClusterID uint
	DefaultBranch        string
	SecretName           string
	PorterYamlPath       string
	Preview              bool
}

func OpenGithubPR(opts *GithubPROpts) (*github.PullRequest, error) {
	var pr *github.PullRequest
	var prBranchName string

	if opts == nil {
		return pr, fmt.Errorf("input options cannot be nil")
	}

	if opts.DeleteWorkflowFilename != "" {
		prBranchName = "porter-stack-delete"
	} else if opts.PreviewWorkflowFilename != "" {
		prBranchName = "porter-stack-preview"
	} else {
		prBranchName = "porter-stack"
	}

	err := createNewBranch(opts.Client,
		opts.GitRepoOwner,
		opts.GitRepoName,
		opts.DefaultBranch,
		prBranchName,
	)
	if err != nil {
		return pr, fmt.Errorf("error creating branch: %w", err)
	}

	err = commitChange(prBranchName, *opts)

	var prTitle string
	if opts.DeleteWorkflowFilename != "" {
		prTitle = fmt.Sprintf("Delete Porter Application %s", opts.StackName)
	} else if opts.PreviewWorkflowFilename != "" {
		prTitle = "Enable Preview Environments on Porter"
	} else {
		prTitle = fmt.Sprintf("Enable Porter Application %s", opts.StackName)
	}
	pr, _, err = opts.Client.PullRequests.Create(
		context.Background(), opts.GitRepoOwner, opts.GitRepoName, &github.NewPullRequest{
			Title: github.String(prTitle),
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

func commitChange(prBranchName string, opts GithubPROpts) error {
	if opts.DeleteWorkflowFilename != "" {
		err := deleteGithubFile(
			opts.Client,
			opts.DeleteWorkflowFilename,
			opts.GitRepoOwner,
			opts.GitRepoName,
			prBranchName,
			false,
		)
		if err != nil {
			return fmt.Errorf("error committing deletion: %w", err)
		}

		return nil
	}

	var preview bool
	if opts.PreviewWorkflowFilename != "" {
		preview = true
	}

	applyWorkflowYAML, err := getStackApplyActionYAML(&GetStackApplyActionYAMLOpts{
		ServerURL:      opts.ServerURL,
		ClusterID:      opts.ClusterID,
		ProjectID:      opts.ProjectID,
		StackName:      opts.StackName,
		DefaultBranch:  opts.DefaultBranch,
		SecretName:     opts.SecretName,
		PorterYamlPath: opts.PorterYamlPath,
		Preview:        preview,
	})
	if err != nil {
		return err
	}

	filename := fmt.Sprintf("porter_stack_%s.yml", strings.ToLower(opts.StackName))
	if preview {
		filename = fmt.Sprintf("porter_preview_%s.yml", strings.ToLower(opts.StackName))
	}

	_, err = commitWorkflowFile(
		opts.Client,
		filename,
		applyWorkflowYAML, opts.GitRepoOwner,
		opts.GitRepoName, prBranchName, false,
	)
	if err != nil {
		return fmt.Errorf("error committing file: %w", err)
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
			opts.PorterYamlPath,
			opts.ProjectID,
			opts.ClusterID,
			opts.Preview,
		),
	}

	if opts.Preview {
		actionYaml := GithubActionYAML{
			On: GithubActionYAMLOnPullRequest{
				PullRequest: GithubActionYAMLOnPullRequestTypes{
					Types: []string{
						"opened",
						"synchronize",
					},
					BranchesIgnore: []string{
						"porter-*",
					},
				},
			},
			Name: "Deploy to Preview Environment",
			Jobs: map[string]GithubActionYAMLJob{
				"porter-deploy": {
					RunsOn: "ubuntu-latest",
					Steps:  gaSteps,
				},
			},
		}

		return yaml.Marshal(actionYaml)
	}

	actionYAML := GithubActionYAML{
		On: GithubActionYAMLOnPush{
			Push: GithubActionYAMLOnPushBranches{
				Branches: []string{
					opts.DefaultBranch,
				},
			},
		},
		Name: fmt.Sprintf("Deploy to %s", opts.StackName),
		Jobs: map[string]GithubActionYAMLJob{
			"porter-deploy": {
				RunsOn: "ubuntu-latest",
				Steps:  gaSteps,
			},
		},
	}

	return yaml.Marshal(actionYAML)
}
