package v2

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
)

func createBuildEvent(ctx context.Context, client api.Client, applicationName string, projectId uint, clusterId uint, deploymentTargetID string, commitSHA string) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-build-event")
	defer span.End()

	req := &types.CreateOrUpdatePorterAppEventRequest{
		Status:             types.PorterAppEventStatus_Progressing,
		Type:               types.PorterAppEventType_Build,
		TypeExternalSource: "GITHUB",
		Metadata:           make(map[string]interface{}),
		DeploymentTargetID: deploymentTargetID,
	}

	actionRunID := os.Getenv("GITHUB_RUN_ID")
	if actionRunID != "" {
		arid, err := strconv.Atoi(actionRunID)
		if err != nil {
			fmt.Println("could not parse action run id")
			return "", telemetry.Error(ctx, span, err, "could not parse action run id")
		}
		req.Metadata["action_run_id"] = arid

		repoName := os.Getenv("GITHUB_REPOSITORY")
		parsedRepoName := strings.Split(repoName, "/")
		if len(parsedRepoName) != 2 {
			fmt.Println("repo name is not in the format owner/name")
			return "", telemetry.Error(ctx, span, nil, "repo name is not in the format owner/name")
		}
		req.Metadata["repo"] = parsedRepoName[1]

		repoOwnerAccountID := os.Getenv("GITHUB_REPOSITORY_OWNER_ID")
		if repoOwnerAccountID != "" {
			arid, err := strconv.Atoi(repoOwnerAccountID)
			if err != nil {
				fmt.Println("could not parse repo owner account id")
				return "", telemetry.Error(ctx, span, err, "could not parse repo owner account id")
			}
			req.Metadata["github_account_id"] = arid
		}
	}

	req.Metadata["commit_sha"] = commitSHA

	event, err := client.CreateOrUpdatePorterAppEvent(ctx, projectId, clusterId, applicationName, req)
	if err != nil {
		fmt.Println("could not create build event")
		return "", telemetry.Error(ctx, span, err, "could not create build event")
	}

	return event.ID, nil
}

func createPredeployEvent(ctx context.Context, client api.Client, applicationName string, projectId, clusterId uint, deploymentTargetID string, createdAt time.Time, appRevisionID string) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-predeploy-event")
	defer span.End()

	req := &types.CreateOrUpdatePorterAppEventRequest{
		Status:             types.PorterAppEventStatus_Progressing,
		Type:               types.PorterAppEventType_PreDeploy,
		Metadata:           make(map[string]interface{}),
		DeploymentTargetID: deploymentTargetID,
	}
	req.Metadata["start_time"] = createdAt
	req.Metadata["app_revision_id"] = appRevisionID

	event, err := client.CreateOrUpdatePorterAppEvent(ctx, projectId, clusterId, applicationName, req)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "could not create predeploy event")
	}

	return event.ID, nil
}

func updateExistingEvent(ctx context.Context, client api.Client, applicationName string, projectId, clusterId uint, deploymentTargetID string, eventType types.PorterAppEventType, eventID string, status types.PorterAppEventStatus, metadata map[string]interface{}) error {
	ctx, span := telemetry.NewSpan(ctx, "update-existing-event")
	defer span.End()

	req := &types.CreateOrUpdatePorterAppEventRequest{
		ID:                 eventID,
		Status:             status,
		Metadata:           metadata,
		DeploymentTargetID: deploymentTargetID,
		Type:               eventType,
	}

	_, err := client.CreateOrUpdatePorterAppEvent(ctx, projectId, clusterId, applicationName, req)
	if err != nil {
		return telemetry.Error(ctx, span, err, "could not update existing app event")
	}

	return nil
}
