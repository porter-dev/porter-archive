package porter_app

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// AppEnvGroupName returns the name of the environment group for the app
func AppEnvGroupName(ctx context.Context, appName string, deploymentTargetId string, clusterID uint, porterAppRepository repository.PorterAppRepository) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "app-env-group-name")
	defer span.End()

	if appName == "" {
		return "", telemetry.Error(ctx, span, nil, "app name is empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	if deploymentTargetId == "" {
		return "", telemetry.Error(ctx, span, nil, "deployment target id is empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetId})

	if clusterID == 0 {
		return "", telemetry.Error(ctx, span, nil, "cluster id is empty")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cluster-id", Value: clusterID})

	porterApp, err := porterAppRepository.ReadPorterAppByName(clusterID, appName)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error reading porter app by name")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-id", Value: porterApp.ID})

	if len(deploymentTargetId) < 6 {
		return "", telemetry.Error(ctx, span, nil, "deployment target id is too short")
	}

	return fmt.Sprintf("%d-%s", porterApp.ID, deploymentTargetId[:6]), nil
}
