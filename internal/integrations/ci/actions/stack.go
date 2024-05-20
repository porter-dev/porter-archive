package actions

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/go-github/v41/github"
	"gopkg.in/yaml.v2"
)

// GithubPRAction is an action to take when opening a PR
type GithubPRAction string

const (
	// GithubPRAction_NewAppWorkflow is the action for creating a workflow for a new application
	GithubPRAction_NewAppWorkflow GithubPRAction = "new-app-workflow"
	// GithubPRAction_DeleteAppWorkflow is the action for deleting an application workflow
	GithubPRAction_DeleteAppWorkflow GithubPRAction = "delete-app-workflow"
	// GithubPRAction_PreviewAppWorkflow is the action for creating the preview app workflow
	GithubPRAction_PreviewAppWorkflow GithubPRAction = "preview-app-workflow"
	// GithubPRAction_ManualPreviewDeploy is the action for manually deploying a preview environment
	GithubPRAction_ManualPreviewDeploy GithubPRAction = "manual-preview-deploy"
)

type GithubPROpts struct {
	PRAction                  GithubPRAction
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
	WorkflowFileName          string
	PRBranch                  string
	DeploymentTargetId        string
}

type GetStackApplyActionYAMLOpts struct {
	ServerURL            string
	StackName            string
	ProjectID, ClusterID uint
	DefaultBranch        string
	SecretName           string
	PorterYamlPath       string
	Preview              bool
	DeploymentTargetId   string
}

func OpenGithubPR(opts *GithubPROpts) (*github.PullRequest, error) {
	var pr *github.PullRequest

	if opts == nil {
		return pr, fmt.Errorf("input options cannot be nil")
	}

	err := createNewBranch(opts.Client,
		opts.GitRepoOwner,
		opts.GitRepoName,
		opts.DefaultBranch,
		opts.PRBranch,
	)
	if err != nil {
		return pr, fmt.Errorf("error creating branch: %w", err)
	}

	err = commitChange(opts.PRBranch, *opts)
	if err != nil {
		return pr, fmt.Errorf("error committing change: %w", err)
	}

	prTitle := getPRTitle(opts.PRAction, opts.StackName)
	pr, _, err = opts.Client.PullRequests.Create(
		context.Background(), opts.GitRepoOwner, opts.GitRepoName, &github.NewPullRequest{
			Title: github.String(prTitle),
			Base:  github.String(opts.DefaultBranch),
			Head:  github.String(opts.PRBranch),
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

func getPRTitle(action GithubPRAction, stackName string) string {
	switch action {
	case GithubPRAction_NewAppWorkflow:
		return fmt.Sprintf("Enable Porter Application %s", stackName)
	case GithubPRAction_DeleteAppWorkflow:
		return fmt.Sprintf("Delete Porter Application %s", stackName)
	case GithubPRAction_PreviewAppWorkflow:
		return "Enable Preview Environments on Porter"
	case GithubPRAction_ManualPreviewDeploy:
		return "Deploy Preview Environments Manually"
	default:
		return ""
	}
}

func commitChange(prBranchName string, opts GithubPROpts) error {
	switch opts.PRAction {
	case GithubPRAction_NewAppWorkflow:
		applyWorkflowYAML, err := getStackApplyActionYAML(&GetStackApplyActionYAMLOpts{
			ServerURL:          opts.ServerURL,
			ClusterID:          opts.ClusterID,
			ProjectID:          opts.ProjectID,
			StackName:          opts.StackName,
			DefaultBranch:      opts.DefaultBranch,
			SecretName:         opts.SecretName,
			PorterYamlPath:     opts.PorterYamlPath,
			DeploymentTargetId: opts.DeploymentTargetId,
			Preview:            false,
		})
		if err != nil {
			return err
		}

		_, err = commitWorkflowFile(
			opts.Client,
			fmt.Sprintf("porter_stack_%s.yml", strings.ToLower(opts.StackName)),
			applyWorkflowYAML, opts.GitRepoOwner,
			opts.GitRepoName, prBranchName, false,
		)
		if err != nil {
			return fmt.Errorf("error committing file: %w", err)
		}

		return nil
	case GithubPRAction_DeleteAppWorkflow:
		err := deleteGithubFile(
			opts.Client,
			opts.WorkflowFileName,
			opts.GitRepoOwner,
			opts.GitRepoName,
			prBranchName,
			false,
		)
		if err != nil {
			return fmt.Errorf("error committing deletion: %w", err)
		}

		return nil
	case GithubPRAction_PreviewAppWorkflow:
		previewWorkflowYAML, err := getStackApplyActionYAML(&GetStackApplyActionYAMLOpts{
			ServerURL:      opts.ServerURL,
			ClusterID:      opts.ClusterID,
			ProjectID:      opts.ProjectID,
			StackName:      opts.StackName,
			DefaultBranch:  opts.DefaultBranch,
			SecretName:     opts.SecretName,
			PorterYamlPath: opts.PorterYamlPath,
			Preview:        true,
		})
		if err != nil {
			return err
		}

		_, err = commitWorkflowFile(
			opts.Client,
			fmt.Sprintf("porter_preview_%s.yml", strings.ToLower(opts.StackName)),
			previewWorkflowYAML, opts.GitRepoOwner,
			opts.GitRepoName, prBranchName, false,
		)
		if err != nil {
			return fmt.Errorf("error committing file: %w", err)
		}

		return nil
	case GithubPRAction_ManualPreviewDeploy:
		manualPreviewWorkflowYaml, err := getManualPreviewActionYAML(&GetStackApplyActionYAMLOpts{
			ServerURL:          opts.ServerURL,
			ClusterID:          opts.ClusterID,
			ProjectID:          opts.ProjectID,
			StackName:          opts.StackName,
			DefaultBranch:      opts.DefaultBranch,
			SecretName:         opts.SecretName,
			PorterYamlPath:     opts.PorterYamlPath,
			DeploymentTargetId: opts.DeploymentTargetId,
			Preview:            true,
		})
		if err != nil {
			return err
		}

		_, err = commitWorkflowFile(
			opts.Client,
			fmt.Sprintf("porter_manual_preview_%s.yml", strings.ToLower(opts.StackName)),
			manualPreviewWorkflowYaml, opts.GitRepoOwner,
			opts.GitRepoName, prBranchName, false,
		)
		if err != nil {
			return fmt.Errorf("error committing file: %w", err)
		}

		return nil
	default:
		return fmt.Errorf("invalid PR action: %s", opts.PRAction)
	}
}

func getManualPreviewActionYAML(opts *GetStackApplyActionYAMLOpts) ([]byte, error) {
	checkoutWithUsesRef := GithubActionYAMLStep{
		Name: "Checkout code",
		Uses: "actions/checkout@v3",
		With: map[string]string{
			"ref": "${{ github.event.inputs.branch }}",
		},
	}

	gaSteps := []GithubActionYAMLStep{
		checkoutWithUsesRef,
		getSetTagStep(),
		getSetupPorterStep(),
		getDeployStackStep(
			opts.ServerURL,
			opts.SecretName,
			opts.StackName,
			"v0.1.0",
			opts.PorterYamlPath,
			opts.ProjectID,
			opts.ClusterID,
			opts.DeploymentTargetId,
			true,
		),
	}

	actionYAML := GithubActionYAML{
		On: map[string]interface{}{
			"workflow_dispatch": map[string]interface{}{
				"inputs": map[string]interface{}{
					"branch": map[string]interface{}{
						"description": "Base branch tod deploy",
						"type":        "string",
						"required":    true,
					},
				},
			},
		},
		Name: fmt.Sprintf("Deploy Preview for %s", opts.StackName),
		Jobs: map[string]GithubActionYAMLJob{
			"porter-deploy": {
				RunsOn: "ubuntu-latest",
				Steps:  gaSteps,
			},
		},
	}

	by, err := yaml.Marshal(actionYAML)
	if err != nil {
		return nil, fmt.Errorf("error marshalling yaml: %w", err)
	}

	return by, nil
}

func getStackApplyActionYAML(opts *GetStackApplyActionYAMLOpts) ([]byte, error) {
	gaSteps := []GithubActionYAMLStep{
		getCheckoutCodeStep(),
		getSetTagStep(),
		getSetupPorterStep(),
		getDeployStackStep(
			opts.ServerURL,
			opts.SecretName,
			opts.StackName,
			"v0.1.0",
			opts.PorterYamlPath,
			opts.ProjectID,
			opts.ClusterID,
			opts.DeploymentTargetId,
			opts.Preview,
		),
	}

	if opts.Preview {
		actionYaml := GithubActionYAML{
			On: GithubActionYAMLOnPullRequest{
				PullRequest: GithubActionYAMLOnPullRequestTypes{
					Paths: []string{
						"**",
						"!.github/workflows/porter_**",
					},
					Branches: []string{
						opts.DefaultBranch,
					},
					Types: []string{
						"opened",
						"synchronize",
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
