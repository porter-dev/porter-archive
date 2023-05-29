package stacks

import (
	"context"
	"fmt"
	"net/http"
	"reflect"
	"strconv"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
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
	}
}

func (p *CreateUpdatePorterAppEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-post-porter-app-event")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	request := &types.CreateOrUpdatePorterAppEventRequest{}
	if ok := p.DecodeAndValidate(w, r, request); !ok {
		e := telemetry.Error(ctx, span, nil, "error decoding request")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	stackName, reqErr := requestutils.GetURLParamString(r, types.URLParamStackName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, nil, "error parsing stack name from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	if request.ID == "" {
		event, err := p.createNewAppEvent(ctx, *cluster, stackName, request.Status, string(request.Type), request.TypeExternalSource, request.Metadata)
		if err != nil {
			e := telemetry.Error(ctx, span, nil, "error creating new app event")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
		p.WriteResult(w, r, event)
		return
	}
	porterAppEventID, err := uuid.Parse(request.ID)
	if err != nil {
		e := telemetry.Error(ctx, span, nil, "invalid UUID supplied as event ID")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	event, err := p.updateExistingAppEvent(ctx, *cluster, stackName, porterAppEventID)
	if err != nil {
		e := telemetry.Error(ctx, span, nil, "error updating existing app event")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	p.WriteResult(w, r, event)
}

func (p *CreateUpdatePorterAppEventHandler) createNewAppEvent(ctx context.Context, cluster models.Cluster, stackName string, status string, eventType string, externalSource string, requestMetadata map[string]any) (types.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-porter-app-event")
	defer span.End()

	app, err := p.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving porter app by name for cluster")
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "stack-app-name", Value: stackName},
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	event := models.PorterAppEvent{
		ID:                 uuid.New(),
		Status:             status,
		Type:               eventType,
		TypeExternalSource: externalSource,
		PorterAppID:        app.ID,
		Metadata:           make(map[string]any),
	}

	for k, v := range requestMetadata {
		event.Metadata[k] = v
	}

	err = p.Repo().PorterAppEvent().CreateEvent(ctx, &event)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error creating porter app event")
	}

	if event.ID == uuid.Nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app event not found")
	}

	return event.ToPorterAppEvent(), nil
}

func (p *CreateUpdatePorterAppEventHandler) updateExistingAppEvent(ctx context.Context, cluster models.Cluster, stackName string, id uuid.UUID) (types.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "update-porter-app-event")
	defer span.End()

	event, err := p.Repo().PorterAppEvent().ReadEvent(ctx, id)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving porter app by name for cluster")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-id", Value: event.PorterAppID},
		telemetry.AttributeKV{Key: "porter-app-event-id", Value: event.ID.String()},
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	repoOrg, ok := event.Metadata["org"].(string)
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving repo org from metadata")
	}

	repoName, ok := event.Metadata["repo"].(string)
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving repo name from metadata")
	}

	actionRunIDIface, ok := event.Metadata["action_run_id"]
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving action run id from metadata")
	}
	actionRunID, ok := actionRunIDIface.(float64)
	if !ok {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "action-run-id-type", Value: reflect.TypeOf(actionRunIDIface).String()})
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error converting action run id to int")
	}

	accountIDIface, ok := event.Metadata["github_account_id"]
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving github account id from metadata")
	}
	githubAccountID, ok := accountIDIface.(float64)
	if !ok {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "github-account-id-type", Value: reflect.TypeOf(accountIDIface).String()})
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error converting github account id to int")
	}

	// read the environment to get the environment id
	env, err := p.Repo().GithubAppInstallation().ReadGithubAppInstallationByAccountID(int64(githubAccountID))
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error reading github environment by owner repo name")
	}

	ghClient, err := getGithubClientFromEnvironment(p.Config(), env.InstallationID)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error getting github client using porter application")
	}

	actionRun, _, err := ghClient.Actions.GetWorkflowRunByID(ctx, repoOrg, repoName, int64(actionRunID))
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error getting github action run by id")
	}

	if *actionRun.Status == "completed" {
		if *actionRun.Conclusion == "success" {
			event.Status = "SUCCESS"
		} else {
			event.Status = "FAILED"
		}
	}

	err = p.Repo().PorterAppEvent().UpdateEvent(ctx, &event)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error creating porter app event")
	}

	if event.ID == uuid.Nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app event not found")
	}

	return event.ToPorterAppEvent(), nil
}

func getGithubClientFromEnvironment(config *config.Config, installationID int64) (*github.Client, error) {
	// get the github app client
	ghAppId, err := strconv.Atoi(config.ServerConf.GithubAppID)
	if err != nil {
		return nil, fmt.Errorf("malformed GITHUB_APP_ID in server configuration: %w", err)
	}

	// authenticate as github app installation
	itr, err := ghinstallation.New(
		http.DefaultTransport,
		int64(ghAppId),
		installationID,
		config.ServerConf.GithubAppSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("error in creating github client from preview environment: %w", err)
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}
