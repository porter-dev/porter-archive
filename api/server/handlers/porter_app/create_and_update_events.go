package porter_app

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"connectrpc.com/connect"

	"github.com/google/uuid"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app/notifications"
	"github.com/porter-dev/porter/internal/telemetry"
)

type CreateUpdatePorterAppEventHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateUpdatePorterAppEventHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateUpdatePorterAppEventHandler {
	return &CreateUpdatePorterAppEventHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (p *CreateUpdatePorterAppEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-post-porter-app-event")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.CreateOrUpdatePorterAppEventRequest{}
	if ok := p.DecodeAndValidate(w, r, request); !ok {
		e := telemetry.Error(ctx, span, nil, "error decoding request")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing stack name from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-name", Value: appName},
		telemetry.AttributeKV{Key: "porter-app-event-type", Value: string(request.Type)},
		telemetry.AttributeKV{Key: "porter-app-event-status", Value: string(request.Status)},
		telemetry.AttributeKV{Key: "porter-app-event-external-source", Value: request.TypeExternalSource},
		telemetry.AttributeKV{Key: "porter-app-event-id", Value: request.ID},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
	)

	if request.Type == types.PorterAppEventType_Build {
		validateApplyV2 := project.GetFeatureFlag(models.ValidateApplyV2, p.Config().LaunchDarklyClient)
		reportBuildStatus(ctx, request, p.Config(), user, project, appName, validateApplyV2)
	}

	// if sandbox, reroute the event to the hosted project and cluster ids
	if p.Config().ServerConf.EnableSandbox {
		deploymentTarget, err := p.Repo().DeploymentTarget().DeploymentTargetById(request.DeploymentTargetID)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error getting deployment target by id")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTarget.ID},
			telemetry.AttributeKV{Key: "hosted-project-id", Value: deploymentTarget.ProjectID},
			telemetry.AttributeKV{Key: "hosted-cluster-id", Value: deploymentTarget.ClusterID},
		)

		project, err = p.Repo().Project().ReadProject(uint(deploymentTarget.ProjectID))
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error reading project")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}

		if !project.EnableSandbox {
			e := telemetry.Error(ctx, span, nil, "project does not have sandbox enabled")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}

		cluster, err = p.Repo().Cluster().ReadCluster(project.ID, uint(deploymentTarget.ClusterID))
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error reading cluster")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}
	}

	var event types.PorterAppEvent
	var err error
	if request.ID == "" { // no event id provided, so create a new event/notification
		// This branch will only be hit for v2 app_event type events
		if request.DeploymentTargetID != "" && request.Type == types.PorterAppEventType_AppEvent {
			err := p.handleNotification(ctx, request, project.ID, cluster.ID) // no event will be returned when a notification is handled
			if err != nil {
				e := telemetry.Error(ctx, span, err, "error handling notification")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
				return
			}
		}
	} else { // event id provided, so update an existing event matching that event
		event, err = p.updateExistingAppEvent(ctx, *cluster, appName, *request)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error creating new app event")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
	}
	p.WriteResult(w, r, event)
}

func reportBuildStatus(ctx context.Context, request *types.CreateOrUpdatePorterAppEventRequest, config *config.Config, user *models.User, project *models.Project, stackName string, validateApplyV2 bool) {
	ctx, span := telemetry.NewSpan(ctx, "report-build-status")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-build-status", Value: string(request.Status)})

	var errStr string
	var buildLogs string
	if errors, ok := request.Metadata["errors"]; ok {
		if errs, ok := errors.(map[string]interface{}); ok {
			errStringMap := make(map[string]string)
			for k, v := range errs {
				if valueStr, ok := v.(string); ok {
					if k == "b64-build-logs" {
						buildLogs = valueStr
					} else {
						errStringMap[k] = valueStr
					}
				}
			}

			for k, v := range errStringMap {
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: telemetry.AttributeKey(fmt.Sprintf("resource-%s", k)), Value: v})
				errStr += k + ": " + v + ", "
			}
			errStr = strings.TrimSuffix(errStr, ", ")
			_ = telemetry.Error(ctx, span, nil, errStr)
		}
	}

	_ = TrackStackBuildStatus(ctx, config, user, project, stackName, errStr, request.Status, validateApplyV2, buildLogs)
}

func (p *CreateUpdatePorterAppEventHandler) updateExistingAppEvent(ctx context.Context, cluster models.Cluster, porterAppName string, submittedEvent types.CreateOrUpdatePorterAppEventRequest) (types.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "update-porter-app-event")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-name", Value: porterAppName},
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	if submittedEvent.ID == "" {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app event id is required")
	}
	submittedEventID, err := uuid.Parse(submittedEvent.ID)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error parsing porter app event id as uuid")
	}

	existingAppEvent, err := p.Repo().PorterAppEvent().ReadEvent(ctx, submittedEventID)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error retrieving porter app event by id")
	}

	if submittedEvent.Status != "" {
		existingAppEvent.Status = string(submittedEvent.Status)
	}

	if submittedEvent.Metadata != nil {
		for k, v := range submittedEvent.Metadata {
			existingAppEvent.Metadata[k] = v
		}
	}

	err = p.Repo().PorterAppEvent().UpdateEvent(ctx, &existingAppEvent)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error updating porter app event")
	}

	return existingAppEvent.ToPorterAppEvent(), nil
}

// handleNotification handles all logic for notifications in app v2
func (p *CreateUpdatePorterAppEventHandler) handleNotification(ctx context.Context,
	request *types.CreateOrUpdatePorterAppEventRequest,
	projectId, clusterId uint,
) error {
	ctx, span := telemetry.NewSpan(ctx, "serve-handle-notification")
	defer span.End()

	agentEventMetadata, err := notifications.ParseAgentEventMetadata(request.Metadata)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to unmarshal app event metadata")
	}
	if agentEventMetadata == nil {
		return telemetry.Error(ctx, span, nil, "app event metadata is nil")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-event-type", Value: agentEventMetadata.AppEventType.String()})

	createNotificationRequest := connect.NewRequest(&porterv1.CreateNotificationRequest{
		ProjectId: int64(projectId),
		ClusterId: int64(clusterId),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id: request.DeploymentTargetID,
		},
		AppName:            agentEventMetadata.AppName,
		ServiceName:        agentEventMetadata.ServiceName,
		AppRevisionId:      agentEventMetadata.AppRevisionID,
		PorterAgentEventId: int64(agentEventMetadata.AgentEventID),
		AppEventType:       agentEventMetadata.AppEventType,
		RawSummary:         agentEventMetadata.Summary,
		RawDetail:          agentEventMetadata.Detail,
		JobRunId:           agentEventMetadata.JobRunID,
	})

	_, err = p.Config().ClusterControlPlaneClient.CreateNotification(ctx, createNotificationRequest)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error creating notification")
	}

	return nil
}
