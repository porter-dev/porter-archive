package porter_app

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/go-github/v39/github"
	"github.com/google/uuid"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app"
	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
	"github.com/porter-dev/porter/internal/telemetry"
	"k8s.io/utils/pointer"
)

// ReportRevisionStatusHandler is the handler for the /apps/{porter_app_name}/revisions/{app_revision_id}/status endpoint
type ReportRevisionStatusHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewReportRevisionStatusHandler handles POST requests to the endpoint /apps/{porter_app_name}/revisions/{app_revision_id}/status
func NewReportRevisionStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ReportRevisionStatusHandler {
	return &ReportRevisionStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ReportRevisionStatusRequest is the request object for the /apps/{porter_app_name}/revisions/{app_revision_id}/status endpoint
type ReportRevisionStatusRequest struct {
	PRNumber  int    `json:"pr_number"`
	CommitSHA string `json:"commit_sha"`
}

// ReportRevisionStatusResponse is the response object for the /apps/{porter_app_name}/revisions/{app_revision_id}/status endpoint
type ReportRevisionStatusResponse struct{}

// ServeHTTP reports the status of a revision to Github and other integrations, depending on the status and the deployment target
func (c *ReportRevisionStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-report-revision-status")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "project does not have validate apply v2 enabled")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-name", Value: appName})

	revisionID, reqErr := requestutils.GetURLParamString(r, types.URLParamAppRevisionID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing app revision id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-revision-id", Value: revisionID})

	appRevisionUuid, err := uuid.Parse(revisionID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error parsing app revision id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if appRevisionUuid == uuid.Nil {
		err := telemetry.Error(ctx, span, nil, "app revision id is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-revision-id", Value: appRevisionUuid.String()})

	porterApp, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, appName)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error reading porter app by name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if porterApp.ID == 0 {
		err := telemetry.Error(ctx, span, nil, "porter app not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-id", Value: porterApp.ID})

	request := &ReportRevisionStatusRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	revision, err := porter_app.GetAppRevision(ctx, porter_app.GetAppRevisionInput{
		AppRevisionID: appRevisionUuid,
		ProjectID:     project.ID,
		CCPClient:     c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting app revision")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	deploymentTarget, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
		ProjectID:          int64(project.ID),
		ClusterID:          int64(cluster.ID),
		DeploymentTargetID: revision.DeploymentTarget.ID,
		CCPClient:          c.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting deployment target details")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTarget.ID},
		telemetry.AttributeKV{Key: "pr-number", Value: request.PRNumber},
		telemetry.AttributeKV{Key: "commit-sha", Value: request.CommitSHA},
		telemetry.AttributeKV{Key: "is-preview", Value: deploymentTarget.IsPreview},
		telemetry.AttributeKV{Key: "revision-number", Value: revision.RevisionNumber},
	)

	resp := &ReportRevisionStatusResponse{}

	if !deploymentTarget.IsPreview || request.PRNumber == 0 || revision.RevisionNumber > 1 {
		c.WriteResult(w, r, resp)
		return
	}

	err = writePRComment(ctx, writePRCommentInput{
		revision:        revision,
		porterApp:       porterApp,
		prNumber:        request.PRNumber,
		commitSha:       request.CommitSHA,
		serverURL:       c.Config().ServerConf.ServerURL,
		githubAppSecret: c.Config().ServerConf.GithubAppSecret,
		githubAppID:     c.Config().ServerConf.GithubAppID,
	})
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error writing pr comment")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, resp)
}

type writePRCommentInput struct {
	revision  porter_app.Revision
	porterApp *models.PorterApp
	prNumber  int
	commitSha string
	serverURL string

	githubAppSecret []byte
	githubAppID     string
}

func writePRComment(ctx context.Context, inp writePRCommentInput) error {
	ctx, span := telemetry.NewSpan(ctx, "write-pr-comment")
	defer span.End()

	if inp.porterApp == nil {
		return telemetry.Error(ctx, span, nil, "porter app is nil")
	}
	if inp.prNumber == 0 {
		return telemetry.Error(ctx, span, nil, "pr number is empty")
	}
	if inp.commitSha == "" {
		return telemetry.Error(ctx, span, nil, "commit sha is empty")
	}
	if inp.githubAppSecret == nil {
		return telemetry.Error(ctx, span, nil, "github app secret is empty")
	}
	if inp.githubAppID == "" {
		return telemetry.Error(ctx, span, nil, "github app id is empty")
	}
	if inp.serverURL == "" {
		return telemetry.Error(ctx, span, nil, "server url is empty")
	}

	client, err := porter_app.GetGithubClientByRepoID(ctx, inp.porterApp.GitRepoID, inp.githubAppSecret, inp.githubAppID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error getting github client")
	}

	repoDetails := strings.Split(inp.porterApp.RepoName, "/")
	if len(repoDetails) != 2 {
		return telemetry.Error(ctx, span, nil, "repo name is not in the format <org>/<repo>")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "repo-owner", Value: repoDetails[0]},
		telemetry.AttributeKV{Key: "repo-name", Value: repoDetails[1]},
		telemetry.AttributeKV{Key: "pr-number", Value: inp.prNumber},
		telemetry.AttributeKV{Key: "commit-sha", Value: inp.commitSha},
	)

	decoded, err := base64.StdEncoding.DecodeString(inp.revision.B64AppProto)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error decoding base proto")
	}

	appProto := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, appProto)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error unmarshalling app proto")
	}

	app, err := v2.AppFromProto(appProto)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error converting app proto to app")
	}

	body := "## Porter Preview Environments\n"
	porterURL := fmt.Sprintf("%s/preview-environments/apps/%s?target=%s", inp.serverURL, inp.porterApp.Name, inp.revision.DeploymentTarget.ID)

	switch inp.revision.Status {
	case models.AppRevisionStatus_BuildFailed:
		body = fmt.Sprintf("%s❌ The latest deploy failed to build. Check the [Porter Dashboard](%s) or [action logs](https://github.com/%s/actions/runs/) for more information.", body, porterURL, inp.porterApp.RepoName)
	case models.AppRevisionStatus_InstallFailed:
		body = fmt.Sprintf("%s❌ The latest SHA ([`%s`](https://github.com/%s/%s/commit/%s)) failed to deploy.\nCheck the [Porter Dashboard](%s) or [action logs](https://github.com/%s/actions/runs/) for more information.\nContact Porter Support if the errors persists", body, inp.commitSha, repoDetails[0], repoDetails[1], inp.commitSha, porterURL, inp.porterApp.RepoName)
	case models.AppRevisionStatus_InstallSuccessful:
		body = fmt.Sprintf("%s✅ The latest SHA ([`%s`](https://github.com/%s/%s/commit/%s)) has been successfully deployed.\nApp details available in the [Porter Dashboard](%s)", body, inp.commitSha, repoDetails[0], repoDetails[1], inp.commitSha, porterURL)
	default:
		return nil
	}

	for _, service := range app.Services {
		if service.Domains != nil && len(service.Domains) > 0 {
			body = fmt.Sprintf("%s\n\n**Preview URL**: https://%s", body, service.Domains[0].Name)
		}
	}

	_, _, err = client.Issues.CreateComment(
		ctx,
		repoDetails[0],
		repoDetails[1],
		inp.prNumber,
		&github.IssueComment{
			Body: pointer.String(body),
		},
	)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error creating github comment")
	}

	return nil
}
