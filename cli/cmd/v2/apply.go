package v2

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/porter-dev/porter/api/server/handlers/porter_app"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"

	"github.com/cli/cli/git"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

// ApplyInput is the input for the Apply function
type ApplyInput struct {
	// CLIConfig is the CLI configuration
	CLIConfig config.CLIConfig
	// Client is the Porter API client
	Client api.Client
	// PorterYamlPath is the path to the porter.yaml file
	PorterYamlPath string
	// AppName is the name of the app
	AppName string
	// PreviewApply is true when Apply should create a new deployment target matching current git branch and apply to that target
	PreviewApply bool
}

// Apply implements the functionality of the `porter apply` command for validate apply v2 projects
func Apply(ctx context.Context, inp ApplyInput) error {
	cliConf := inp.CLIConfig
	client := inp.Client

	deploymentTargetID, err := deploymentTargetFromConfig(ctx, client, cliConf.Project, cliConf.Cluster, inp.PreviewApply)
	if err != nil {
		return fmt.Errorf("error getting deployment target from config: %w", err)
	}

	var prNumber int
	prNumberEnv := os.Getenv("PORTER_PR_NUMBER")
	if prNumberEnv != "" {
		prNumber, err = strconv.Atoi(prNumberEnv)
		if err != nil {
			return fmt.Errorf("error parsing PORTER_PR_NUMBER to int: %w", err)
		}
	}

	porterYamlExists := len(inp.PorterYamlPath) != 0

	if porterYamlExists {
		_, err := os.Stat(filepath.Clean(inp.PorterYamlPath))
		if err != nil {
			if !os.IsNotExist(err) {
				return fmt.Errorf("error checking if porter yaml exists at path %s: %w", inp.PorterYamlPath, err)
			}
			// If a path was specified but the file does not exist, we will not immediately error out.
			// This supports users migrated from v1 who use a workflow file that always specifies a porter yaml path
			// in the apply command.
			porterYamlExists = false
		}
	}

	var b64YAML string
	if porterYamlExists {
		porterYaml, err := os.ReadFile(filepath.Clean(inp.PorterYamlPath))
		if err != nil {
			return fmt.Errorf("could not read porter yaml file: %w", err)
		}

		b64YAML = base64.StdEncoding.EncodeToString(porterYaml)
		color.New(color.FgGreen).Printf("Using Porter YAML at path: %s\n", inp.PorterYamlPath) // nolint:errcheck,gosec
	}

	commitSHA := commitSHAFromEnv()
	gitSource, err := gitSourceFromEnv()
	if err != nil {
		return fmt.Errorf("error getting git source from env: %w", err)
	}

	updateInput := api.UpdateAppInput{
		ProjectID:          cliConf.Project,
		ClusterID:          cliConf.Cluster,
		Name:               inp.AppName,
		GitSource:          gitSource,
		DeploymentTargetId: deploymentTargetID,
		Base64PorterYAML:   b64YAML,
		CommitSHA:          commitSHA,
	}

	updateResp, err := client.UpdateApp(ctx, updateInput)
	if err != nil {
		return fmt.Errorf("error calling update app endpoint: %w", err)
	}

	if updateResp.AppRevisionId == "" {
		return errors.New("app revision id is empty")
	}

	appName := updateResp.AppName

	buildSettings, err := client.GetBuildFromRevision(ctx, cliConf.Project, cliConf.Cluster, appName, updateResp.AppRevisionId)
	if err != nil {
		return fmt.Errorf("error getting build from revision: %w", err)
	}

	if buildSettings != nil && buildSettings.Build.Method != "" {
		eventID, _ := createBuildEvent(ctx, client, appName, cliConf.Project, cliConf.Cluster, deploymentTargetID, commitSHA)

		reportBuildFailureInput := reportBuildFailureInput{
			client:             client,
			appName:            appName,
			cliConf:            cliConf,
			deploymentTargetID: deploymentTargetID,
			appRevisionID:      updateResp.AppRevisionId,
			eventID:            eventID,
			commitSHA:          commitSHA,
			prNumber:           prNumber,
		}

		if commitSHA == "" {
			return errors.New("build is required but commit SHA cannot be identified. Please set the PORTER_COMMIT_SHA environment variable or run apply in git repository with access to the git CLI")
		}

		color.New(color.FgGreen).Printf("Building new image with tag %s...\n", commitSHA) // nolint:errcheck,gosec

		buildInput, err := buildInputFromBuildSettings(cliConf.Project, appName, commitSHA, buildSettings.Image, buildSettings.Build)
		if err != nil {
			err := fmt.Errorf("error creating build input from build settings: %w", err)
			reportBuildFailureInput.buildError = err
			_ = reportBuildFailure(ctx, reportBuildFailureInput)
			return err
		}

		buildOutput := build(ctx, client, buildInput)
		if buildOutput.Error != nil {
			err := fmt.Errorf("error building app: %w", buildOutput.Error)
			reportBuildFailureInput.buildLogs = buildOutput.Logs
			reportBuildFailureInput.buildError = buildOutput.Error
			_ = reportBuildFailure(ctx, reportBuildFailureInput)
			return err
		}

		_, err = client.UpdateRevisionStatus(ctx, cliConf.Project, cliConf.Cluster, appName, updateResp.AppRevisionId, models.AppRevisionStatus_BuildSuccessful)
		if err != nil {
			err := fmt.Errorf("error updating revision status post build: %w", err)
			reportBuildFailureInput.buildError = err
			_ = reportBuildFailure(ctx, reportBuildFailureInput)
			return err
		}

		color.New(color.FgGreen).Printf("Successfully built image (tag: %s)\n", buildSettings.Image.Tag) // nolint:errcheck,gosec

		buildMetadata := make(map[string]interface{})
		buildMetadata["end_time"] = time.Now().UTC()
		_ = updateExistingEvent(ctx, client, appName, cliConf.Project, cliConf.Cluster, deploymentTargetID, types.PorterAppEventType_Build, eventID, types.PorterAppEventStatus_Success, buildMetadata)
	}

	color.New(color.FgGreen).Printf("Deploying new revision %s for app %s...\n", updateResp.AppRevisionId, appName) // nolint:errcheck,gosec

	now := time.Now().UTC()

	var status models.AppRevisionStatus

	for {
		if time.Since(now) > checkDeployTimeout {
			return errors.New("timed out waiting for app to deploy")
		}

		revision, err := client.GetRevision(ctx, cliConf.Project, cliConf.Cluster, appName, updateResp.AppRevisionId)
		if err != nil {
			return fmt.Errorf("error getting app revision status: %w", err)
		}
		status = revision.AppRevision.Status

		if status == models.AppRevisionStatus_DeployFailed || status == models.AppRevisionStatus_PredeployFailed || status == models.AppRevisionStatus_Deployed {
			break
		}
		if status == models.AppRevisionStatus_AwaitingPredeploy {
			color.New(color.FgGreen).Printf("Waiting for predeploy to complete..\n") // nolint:errcheck,gosec
		}

		time.Sleep(checkDeployFrequency)
	}

	_, _ = client.ReportRevisionStatus(ctx, api.ReportRevisionStatusInput{
		ProjectID:     cliConf.Project,
		ClusterID:     cliConf.Cluster,
		AppName:       appName,
		AppRevisionID: updateResp.AppRevisionId,
		PRNumber:      prNumber,
		CommitSHA:     commitSHA,
	})

	if status == models.AppRevisionStatus_DeployFailed {
		return errors.New("app failed to deploy")
	}
	if status == models.AppRevisionStatus_PredeployFailed {
		return errors.New("predeploy failed for new revision")
	}

	color.New(color.FgGreen).Printf("Successfully applied new revision %s\n", updateResp.AppRevisionId) // nolint:errcheck,gosec
	return nil
}

// checkDeployTimeout is the timeout for checking if an app has been deployed
const checkDeployTimeout = 15 * time.Minute

// checkDeployFrequency is the frequency for checking if an app has been deployed
const checkDeployFrequency = 10 * time.Second

func commitSHAFromEnv() string {
	var commitSHA string
	if os.Getenv("PORTER_COMMIT_SHA") != "" {
		commitSHA = os.Getenv("PORTER_COMMIT_SHA")
	} else if os.Getenv("GITHUB_SHA") != "" {
		commitSHA = os.Getenv("GITHUB_SHA")
	} else if commit, err := git.LastCommit(); err == nil && commit != nil {
		commitSHA = commit.Sha
	}

	return commitSHA
}

func gitSourceFromEnv() (porter_app.GitSource, error) {
	var source porter_app.GitSource

	var repoID uint
	if os.Getenv("GITHUB_REPOSITORY_ID") != "" {
		id, err := strconv.Atoi(os.Getenv("GITHUB_REPOSITORY_ID"))
		if err != nil {
			return source, fmt.Errorf("unable to parse GITHUB_REPOSITORY_ID to int: %w", err)
		}
		repoID = uint(id)
	}

	return porter_app.GitSource{
		GitBranch:   os.Getenv("GITHUB_REF_NAME"),
		GitRepoID:   repoID,
		GitRepoName: os.Getenv("GITHUB_REPOSITORY"),
	}, nil
}

func buildInputFromBuildSettings(projectID uint, appName string, commitSHA string, image porter_app.Image, build porter_app.BuildSettings) (buildInput, error) {
	var buildSettings buildInput

	if appName == "" {
		return buildSettings, errors.New("app name is empty")
	}
	if image.Repository == "" {
		return buildSettings, errors.New("image repository is empty")
	}
	if build.Method == "" {
		return buildSettings, errors.New("build method is empty")
	}
	if commitSHA == "" {
		return buildSettings, errors.New("commit SHA is empty")
	}

	return buildInput{
		ProjectID:     projectID,
		AppName:       appName,
		BuildContext:  build.Context,
		Dockerfile:    build.Dockerfile,
		BuildMethod:   build.Method,
		Builder:       build.Builder,
		BuildPacks:    build.Buildpacks,
		ImageTag:      commitSHA,
		RepositoryURL: image.Repository,
	}, nil
}

func deploymentTargetFromConfig(ctx context.Context, client api.Client, projectID, clusterID uint, previewApply bool) (string, error) {
	var deploymentTargetID string

	if os.Getenv("PORTER_DEPLOYMENT_TARGET_ID") != "" {
		deploymentTargetID = os.Getenv("PORTER_DEPLOYMENT_TARGET_ID")
	}

	if deploymentTargetID == "" {
		targetResp, err := client.DefaultDeploymentTarget(ctx, projectID, clusterID)
		if err != nil {
			return deploymentTargetID, fmt.Errorf("error calling default deployment target endpoint: %w", err)
		}
		deploymentTargetID = targetResp.DeploymentTargetID
	}

	if previewApply {
		var branchName string

		// branch name is set to different values in the GH env, depending on whether or not the workflow is triggered by a PR
		// issue is being tracked here: https://github.com/github/docs/issues/15319
		if os.Getenv("GITHUB_HEAD_REF") != "" {
			branchName = os.Getenv("GITHUB_HEAD_REF")
		} else if os.Getenv("GITHUB_REF_NAME") != "" {
			branchName = os.Getenv("GITHUB_REF_NAME")
		} else if branch, err := git.CurrentBranch(); err == nil {
			branchName = branch
		}

		if branchName == "" {
			return deploymentTargetID, errors.New("branch name is empty. Please run apply in a git repository with access to the git CLI")
		}

		targetResp, err := client.CreateDeploymentTarget(ctx, projectID, clusterID, branchName, true)
		if err != nil {
			return deploymentTargetID, fmt.Errorf("error calling create deployment target endpoint: %w", err)
		}
		deploymentTargetID = targetResp.DeploymentTargetID
	}

	if deploymentTargetID == "" {
		return deploymentTargetID, errors.New("deployment target id is empty")
	}

	return deploymentTargetID, nil
}

type reportBuildFailureInput struct {
	client             api.Client
	appName            string
	cliConf            config.CLIConfig
	deploymentTargetID string
	appRevisionID      string
	eventID            string
	buildError         error
	buildLogs          string
	commitSHA          string
	prNumber           int
}

func reportBuildFailure(ctx context.Context, inp reportBuildFailureInput) error {
	_, err := inp.client.UpdateRevisionStatus(ctx, inp.cliConf.Project, inp.cliConf.Cluster, inp.appName, inp.appRevisionID, models.AppRevisionStatus_BuildFailed)
	if err != nil {
		return err
	}

	buildMetadata := make(map[string]interface{})
	buildMetadata["end_time"] = time.Now().UTC()

	// the below is a temporary solution until we can report build errors via telemetry from the CLI
	errorStringMap := make(map[string]string)
	errorStringMap["build-error"] = fmt.Sprintf("%+v", inp.buildError)
	b64BuildLogs := base64.StdEncoding.EncodeToString([]byte(inp.buildLogs))
	// the key name below must be kept the same so that reportBuildStatus in the CreateOrUpdatePorterAppEvent handler reports logs correctly
	errorStringMap["b64-build-logs"] = b64BuildLogs

	buildMetadata["errors"] = errorStringMap

	err = updateExistingEvent(ctx, inp.client, inp.appName, inp.cliConf.Project, inp.cliConf.Cluster, inp.deploymentTargetID, types.PorterAppEventType_Build, inp.eventID, types.PorterAppEventStatus_Failed, buildMetadata)
	if err != nil {
		return err
	}
	_, err = inp.client.ReportRevisionStatus(ctx, api.ReportRevisionStatusInput{
		ProjectID:     inp.cliConf.Project,
		ClusterID:     inp.cliConf.Cluster,
		AppName:       inp.appName,
		AppRevisionID: inp.appRevisionID,
		PRNumber:      inp.prNumber,
		CommitSHA:     inp.commitSHA,
	})
	if err != nil {
		return err
	}

	return nil
}
