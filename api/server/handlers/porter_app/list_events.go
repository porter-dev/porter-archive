package porter_app

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"strconv"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v41/github"
	"github.com/google/uuid"
	"github.com/gorilla/schema"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"
)

type PorterAppEventListHandler struct {
	handlers.PorterHandlerWriter
}

func NewPorterAppEventListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *PorterAppEventListHandler {
	return &PorterAppEventListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *PorterAppEventListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-porter-app-events")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	stackName, reqErr := requestutils.GetURLParamString(r, types.URLParamStackName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, nil, "error parsing stack name from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	pr := types.PaginationRequest{}
	d := schema.NewDecoder()
	err := d.Decode(&pr, r.URL.Query())
	if err != nil {
		e := telemetry.Error(ctx, span, nil, "error decoding request")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	app, err := p.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	porterAppEvents, paginatedResult, err := p.Repo().PorterAppEvent().ListEventsByPorterAppID(ctx, app.ID, helpers.WithPageSize(20), helpers.WithPage(int(pr.Page)))
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			e := telemetry.Error(ctx, span, nil, "error listing porter app events by porter app id")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
	}

	for idx, appEvent := range porterAppEvents {
		if appEvent.Status == "PROGRESSING" {
			pae, err := p.updateExistingAppEvent(ctx, *cluster, stackName, appEvent.ID)
			if err != nil {
				e := telemetry.Error(ctx, span, nil, "unable to update existing porter app event")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
				return
			}
			porterAppEvents[idx] = &pae
		}
	}

	res := struct {
		Events []types.PorterAppEvent `json:"events"`
		types.PaginationResponse
	}{
		PaginationResponse: types.PaginationResponse(paginatedResult),
	}
	res.Events = make([]types.PorterAppEvent, 0)

	for _, porterApp := range porterAppEvents {
		if porterApp == nil {
			continue
		}
		pa := porterApp.ToPorterAppEvent()
		res.Events = append(res.Events, pa)
	}
	p.WriteResult(w, r, res)
}

func (p *PorterAppEventListHandler) updateExistingAppEvent(ctx context.Context, cluster models.Cluster, stackName string, id uuid.UUID) (models.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "update-porter-app-event")
	defer span.End()

	event, err := p.Repo().PorterAppEvent().ReadEvent(ctx, id)
	if err != nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving porter app by name for cluster")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-id", Value: event.PorterAppID},
		telemetry.AttributeKV{Key: "porter-app-event-id", Value: event.ID.String()},
		telemetry.AttributeKV{Key: "porter-app-event-status", Value: event.Status},
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	repoOrg, ok := event.Metadata["org"].(string)
	if !ok {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving repo org from metadata")
	}

	repoName, ok := event.Metadata["repo"].(string)
	if !ok {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving repo name from metadata")
	}

	actionRunIDIface, ok := event.Metadata["action_run_id"]
	if !ok {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving action run id from metadata")
	}
	actionRunID, ok := actionRunIDIface.(float64)
	if !ok {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "action-run-id-type", Value: reflect.TypeOf(actionRunIDIface).String()})
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error converting action run id to int")
	}

	accountIDIface, ok := event.Metadata["github_account_id"]
	if !ok {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving github account id from metadata")
	}
	githubAccountID, ok := accountIDIface.(float64)
	if !ok {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "github-account-id-type", Value: reflect.TypeOf(accountIDIface).String()})
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error converting github account id to int")
	}

	// read the environment to get the environment id
	env, err := p.Repo().GithubAppInstallation().ReadGithubAppInstallationByAccountID(int64(githubAccountID))
	if err != nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error reading github environment by owner repo name")
	}

	ghClient, err := getGithubClientFromEnvironment(p.Config(), env.InstallationID)
	if err != nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error getting github client using porter application")
	}

	actionRun, _, err := ghClient.Actions.GetWorkflowRunByID(ctx, repoOrg, repoName, int64(actionRunID))
	if err != nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error getting github action run by id")
	}

	if *actionRun.Status == "completed" {
		if *actionRun.Conclusion == "success" {
			event.Status = "SUCCESS"
		} else {
			event.Status = "FAILED"
		}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-event-updated-status", Value: event.Status})

	err = p.Repo().PorterAppEvent().UpdateEvent(ctx, &event)
	if err != nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error creating porter app event")
	}

	if event.ID == uuid.Nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app event not found")
	}

	return event, nil
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
