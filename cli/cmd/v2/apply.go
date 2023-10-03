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
	"github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/models"

	"github.com/cli/cli/git"

	"github.com/fatih/color"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
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
	const forceBuild = true
	var b64AppProto string

	cliConf := inp.CLIConfig
	client := inp.Client

	deploymentTargetID, err := deploymentTargetFromConfig(ctx, client, cliConf.Project, cliConf.Cluster, inp.PreviewApply)
	if err != nil {
		return fmt.Errorf("error getting deployment target from config: %w", err)
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

	// overrides incorporated into the app contract baed on the deployment target
	var b64AppOverrides string

	appName := inp.AppName
	if porterYamlExists {
		porterYaml, err := os.ReadFile(filepath.Clean(inp.PorterYamlPath))
		if err != nil {
			return fmt.Errorf("could not read porter yaml file: %w", err)
		}

		b64YAML := base64.StdEncoding.EncodeToString(porterYaml)

		// last argument is passed to accommodate users with v1 porter yamls
		parseResp, err := client.ParseYAML(ctx, cliConf.Project, cliConf.Cluster, b64YAML, appName)
		if err != nil {
			return fmt.Errorf("error calling parse yaml endpoint: %w", err)
		}

		if parseResp.B64AppProto == "" {
			return errors.New("b64 app proto is empty")
		}
		b64AppProto = parseResp.B64AppProto

		// override app name if provided
		appName, err = appNameFromB64AppProto(parseResp.B64AppProto)
		if err != nil {
			return fmt.Errorf("error getting app name from porter.yaml: %w", err)
		}

		// we only need to create the app if a porter yaml is provided (otherwise it must already exist)
		createPorterAppDBEntryInp, err := createPorterAppDbEntryInputFromProtoAndEnv(parseResp.B64AppProto)
		if err != nil {
			return fmt.Errorf("unable to form porter app creation input from yaml: %w", err)
		}

		err = client.CreatePorterAppDBEntry(ctx, cliConf.Project, cliConf.Cluster, createPorterAppDBEntryInp)
		if err != nil {
			if err.Error() == porter_app.ErrMissingSourceType.Error() {
				return fmt.Errorf("cannot find existing Porter app with name %s and no build or image settings were specified in porter.yaml", appName)
			}
			return fmt.Errorf("unable to create porter app from yaml: %w", err)
		}

		envGroupResp, err := client.CreateOrUpdateAppEnvironment(ctx, cliConf.Project, cliConf.Cluster, appName, deploymentTargetID, parseResp.EnvVariables, parseResp.EnvSecrets, parseResp.B64AppProto)
		if err != nil {
			return fmt.Errorf("error calling create or update app environment group endpoint: %w", err)
		}

		b64AppProto, err = updateEnvGroupsInProto(ctx, b64AppProto, envGroupResp.EnvGroups)
		if err != nil {
			return fmt.Errorf("error updating app env group in proto: %w", err)
		}

		if inp.PreviewApply && parseResp.PreviewApp != nil {
			b64AppOverrides = parseResp.PreviewApp.B64AppProto

			envGroupResp, err := client.CreateOrUpdateAppEnvironment(ctx, cliConf.Project, cliConf.Cluster, appName, deploymentTargetID, parseResp.PreviewApp.EnvVariables, parseResp.PreviewApp.EnvSecrets, parseResp.PreviewApp.B64AppProto)
			if err != nil {
				return fmt.Errorf("error calling create or update app environment group endpoint: %w", err)
			}

			b64AppOverrides, err = updateEnvGroupsInProto(ctx, b64AppOverrides, envGroupResp.EnvGroups)
			if err != nil {
				return fmt.Errorf("error updating app env group in proto: %w", err)
			}
		}

		color.New(color.FgGreen).Printf("Successfully parsed Porter YAML: applying app \"%s\"\n", appName) // nolint:errcheck,gosec
	}

	if appName == "" {
		return errors.New("App name is empty.  Please provide a Porter YAML file specifying the name of the app or set the PORTER_APP_NAME environment variable.")
	}

	commitSHA := commitSHAFromEnv()

	validateResp, err := client.ValidatePorterApp(ctx, api.ValidatePorterAppInput{
		ProjectID:          cliConf.Project,
		ClusterID:          cliConf.Cluster,
		AppName:            appName,
		Base64AppProto:     b64AppProto,
		Base64AppOverrides: b64AppOverrides,
		DeploymentTarget:   deploymentTargetID,
		CommitSHA:          commitSHA,
	})
	if err != nil {
		return fmt.Errorf("error calling validate endpoint: %w", err)
	}

	if validateResp.ValidatedBase64AppProto == "" {
		return errors.New("validated b64 app proto is empty")
	}
	base64AppProto := validateResp.ValidatedBase64AppProto

	applyResp, err := client.ApplyPorterApp(ctx, cliConf.Project, cliConf.Cluster, base64AppProto, deploymentTargetID, "", forceBuild)
	if err != nil {
		return fmt.Errorf("error calling apply endpoint: %w", err)
	}

	if applyResp.AppRevisionId == "" {
		return errors.New("app revision id is empty")
	}

	if applyResp.CLIAction == porterv1.EnumCLIAction_ENUM_CLI_ACTION_BUILD {
		color.New(color.FgGreen).Printf("Building new image...\n") // nolint:errcheck,gosec

		eventID, _ := createBuildEvent(ctx, client, appName, cliConf.Project, cliConf.Cluster, deploymentTargetID)

		if commitSHA == "" {
			err := errors.New("Build is required but commit SHA cannot be identified. Please set the PORTER_COMMIT_SHA environment variable or run apply in git repository with access to the git CLI.")
			_ = reportBuildFailure(ctx, client, appName, cliConf, deploymentTargetID, applyResp.AppRevisionId, eventID, err)
			return err
		}

		buildSettings, err := buildSettingsFromBase64AppProto(base64AppProto)
		if err != nil {
			err := fmt.Errorf("error getting build settings from base64 app proto: %w", err)
			_ = reportBuildFailure(ctx, client, appName, cliConf, deploymentTargetID, applyResp.AppRevisionId, eventID, err)
			return err
		}

		currentAppRevisionResp, err := client.CurrentAppRevision(ctx, cliConf.Project, cliConf.Cluster, appName, deploymentTargetID)
		if err != nil {
			err := fmt.Errorf("error getting current app revision: %w", err)
			_ = reportBuildFailure(ctx, client, appName, cliConf, deploymentTargetID, applyResp.AppRevisionId, eventID, err)
			return err
		}

		if currentAppRevisionResp == nil {
			err := errors.New("current app revision is nil")
			_ = reportBuildFailure(ctx, client, appName, cliConf, deploymentTargetID, applyResp.AppRevisionId, eventID, err)
			return err
		}

		appRevision := currentAppRevisionResp.AppRevision
		if appRevision.B64AppProto == "" {
			err := errors.New("current app revision b64 app proto is empty")
			_ = reportBuildFailure(ctx, client, appName, cliConf, deploymentTargetID, applyResp.AppRevisionId, eventID, err)
			return err
		}

		currentImageTag, err := imageTagFromBase64AppProto(appRevision.B64AppProto)
		if err != nil {
			err := fmt.Errorf("error getting image tag from current app revision: %w", err)
			_ = reportBuildFailure(ctx, client, appName, cliConf, deploymentTargetID, applyResp.AppRevisionId, eventID, err)
			return err
		}

		buildSettings.CurrentImageTag = currentImageTag
		buildSettings.ProjectID = cliConf.Project

		buildEnv, err := client.GetBuildEnv(ctx, cliConf.Project, cliConf.Cluster, appName, appRevision.ID)
		if err != nil {
			err := fmt.Errorf("error getting build env: %w", err)
			_ = reportBuildFailure(ctx, client, appName, cliConf, deploymentTargetID, applyResp.AppRevisionId, eventID, err)
			return err
		}
		buildSettings.Env = buildEnv.BuildEnvVariables

		err = build(ctx, client, buildSettings)
		if err != nil {
			err := fmt.Errorf("error building app: %w", err)
			_ = reportBuildFailure(ctx, client, appName, cliConf, deploymentTargetID, applyResp.AppRevisionId, eventID, err)
			return err
		}

		color.New(color.FgGreen).Printf("Successfully built image (tag: %s)\n", buildSettings.ImageTag) // nolint:errcheck,gosec

		buildMetadata := make(map[string]interface{})
		buildMetadata["end_time"] = time.Now().UTC()
		_ = updateExistingEvent(ctx, client, appName, cliConf.Project, cliConf.Cluster, deploymentTargetID, types.PorterAppEventType_Build, eventID, types.PorterAppEventStatus_Success, buildMetadata)

		applyResp, err = client.ApplyPorterApp(ctx, cliConf.Project, cliConf.Cluster, "", "", applyResp.AppRevisionId, !forceBuild)
		if err != nil {
			return fmt.Errorf("apply error post-build: %w", err)
		}
	}

	color.New(color.FgGreen).Printf("Image tag exists in repository\n") // nolint:errcheck,gosec

	if applyResp.CLIAction == porterv1.EnumCLIAction_ENUM_CLI_ACTION_TRACK_PREDEPLOY {
		color.New(color.FgGreen).Printf("Waiting for predeploy to complete...\n") // nolint:errcheck,gosec

		now := time.Now().UTC()
		eventID, _ := createPredeployEvent(ctx, client, appName, cliConf.Project, cliConf.Cluster, deploymentTargetID, now, applyResp.AppRevisionId)

		eventStatus := types.PorterAppEventStatus_Success
		for {
			if time.Since(now) > checkPredeployTimeout {
				return errors.New("timed out waiting for predeploy to complete")
			}

			predeployStatusResp, err := client.PredeployStatus(ctx, cliConf.Project, cliConf.Cluster, appName, applyResp.AppRevisionId)
			if err != nil {
				return fmt.Errorf("error calling predeploy status endpoint: %w", err)
			}

			if predeployStatusResp.Status == porter_app.PredeployStatus_Failed {
				eventStatus = types.PorterAppEventStatus_Failed
				break
			}
			if predeployStatusResp.Status == porter_app.PredeployStatus_Successful {
				break
			}

			time.Sleep(checkPredeployFrequency)
		}

		metadata := make(map[string]interface{})
		metadata["end_time"] = time.Now().UTC()
		_ = updateExistingEvent(ctx, client, appName, cliConf.Project, cliConf.Cluster, deploymentTargetID, types.PorterAppEventType_PreDeploy, eventID, eventStatus, metadata)

		applyResp, err = client.ApplyPorterApp(ctx, cliConf.Project, cliConf.Cluster, "", "", applyResp.AppRevisionId, !forceBuild)
		if err != nil {
			return fmt.Errorf("apply error post-predeploy: %w", err)
		}
	}

	if applyResp.CLIAction != porterv1.EnumCLIAction_ENUM_CLI_ACTION_NONE {
		return fmt.Errorf("unexpected CLI action: %s", applyResp.CLIAction)
	}

	color.New(color.FgGreen).Printf("Successfully applied new revision %s for app %s\n", applyResp.AppRevisionId, appName) // nolint:errcheck,gosec
	return nil
}

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

// checkPredeployTimeout is the maximum amount of time the CLI will wait for a predeploy to complete before calling apply again
const checkPredeployTimeout = 60 * time.Minute

// checkPredeployFrequency is the frequency at which the CLI will check the status of a predeploy
const checkPredeployFrequency = 10 * time.Second

func appNameFromB64AppProto(base64AppProto string) (string, error) {
	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return "", fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return "", fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	if app.Name == "" {
		return "", fmt.Errorf("app does not contain name")
	}
	return app.Name, nil
}

func createPorterAppDbEntryInputFromProtoAndEnv(base64AppProto string) (api.CreatePorterAppDBEntryInput, error) {
	var input api.CreatePorterAppDBEntryInput

	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return input, fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return input, fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	if app.Name == "" {
		return input, fmt.Errorf("app does not contain name")
	}
	input.AppName = app.Name

	if app.Build != nil {
		if os.Getenv("GITHUB_REPOSITORY_ID") == "" {
			input.Local = true
			return input, nil
		}
		gitRepoId, err := strconv.Atoi(os.Getenv("GITHUB_REPOSITORY_ID"))
		if err != nil {
			return input, fmt.Errorf("unable to parse GITHUB_REPOSITORY_ID to int: %w", err)
		}
		input.GitRepoID = uint(gitRepoId)
		input.GitRepoName = os.Getenv("GITHUB_REPOSITORY")
		input.GitBranch = os.Getenv("GITHUB_REF_NAME")
		input.PorterYamlPath = "porter.yaml"
		return input, nil
	}

	if app.Image != nil {
		input.ImageRepository = app.Image.Repository
		input.ImageTag = app.Image.Tag
		return input, nil
	}

	return input, nil
}

func buildSettingsFromBase64AppProto(base64AppProto string) (buildInput, error) {
	var buildSettings buildInput

	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return buildSettings, fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return buildSettings, fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	if app.Name == "" {
		return buildSettings, fmt.Errorf("app does not contain name")
	}

	if app.Build == nil {
		return buildSettings, fmt.Errorf("app does not contain build settings")
	}

	if app.Image == nil {
		return buildSettings, fmt.Errorf("app does not contain image settings")
	}

	return buildInput{
		AppName:       app.Name,
		BuildContext:  app.Build.Context,
		Dockerfile:    app.Build.Dockerfile,
		BuildMethod:   app.Build.Method,
		Builder:       app.Build.Builder,
		BuildPacks:    app.Build.Buildpacks,
		ImageTag:      app.Image.Tag,
		RepositoryURL: app.Image.Repository,
	}, nil
}

func deploymentTargetFromConfig(ctx context.Context, client api.Client, projectID, clusterID uint, previewApply bool) (string, error) {
	var deploymentTargetID string

	targetResp, err := client.DefaultDeploymentTarget(ctx, projectID, clusterID)
	if err != nil {
		return deploymentTargetID, fmt.Errorf("error calling default deployment target endpoint: %w", err)
	}
	deploymentTargetID = targetResp.DeploymentTargetID

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
			return deploymentTargetID, errors.New("Branch name is empty. Please run apply in a git repository with access to the git CLI.")
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

func imageTagFromBase64AppProto(base64AppProto string) (string, error) {
	var image string

	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return image, fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return image, fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	if app.Image == nil {
		return image, fmt.Errorf("app does not contain image settings")
	}

	if app.Image.Tag == "" {
		return image, fmt.Errorf("app does not contain image tag")
	}

	return app.Image.Tag, nil
}

func updateEnvGroupsInProto(ctx context.Context, base64AppProto string, envGroups []environment_groups.EnvironmentGroup) (string, error) {
	var editedB64AppProto string

	decoded, err := base64.StdEncoding.DecodeString(base64AppProto)
	if err != nil {
		return editedB64AppProto, fmt.Errorf("unable to decode base64 app for revision: %w", err)
	}

	app := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, app)
	if err != nil {
		return editedB64AppProto, fmt.Errorf("unable to unmarshal app for revision: %w", err)
	}

	egs := make([]*porterv1.EnvGroup, 0)
	for _, envGroup := range envGroups {
		egs = append(egs, &porterv1.EnvGroup{
			Name:    envGroup.Name,
			Version: int64(envGroup.Version),
		})
	}
	app.EnvGroups = egs

	marshalled, err := helpers.MarshalContractObject(ctx, app)
	if err != nil {
		return editedB64AppProto, fmt.Errorf("unable to marshal app back to json: %w", err)
	}

	editedB64AppProto = base64.StdEncoding.EncodeToString(marshalled)

	return editedB64AppProto, nil
}

func reportBuildFailure(ctx context.Context, client api.Client, appName string, cliConf config.CLIConfig, deploymentTargetID string, appRevisionID string, eventID string, buildError error) error {
	buildMetadata := make(map[string]interface{})
	buildMetadata["end_time"] = time.Now().UTC()

	// the below is a temporary solution until we can report build errors via telemetry from the CLI
	errorStringMap := make(map[string]string)
	errorStringMap["build-error"] = fmt.Sprintf("%+v", buildError)
	buildMetadata["errors"] = errorStringMap

	err := updateExistingEvent(ctx, client, appName, cliConf.Project, cliConf.Cluster, deploymentTargetID, types.PorterAppEventType_Build, eventID, types.PorterAppEventStatus_Failed, buildMetadata)
	if err != nil {
		return err
	}
	_, err = client.UpdateRevisionStatus(ctx, cliConf.Project, cliConf.Cluster, appName, appRevisionID, models.AppRevisionStatus_BuildFailed)
	if err != nil {
		return err
	}
	return nil
}
