package gitinstallation

import (
	"net/http"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
)

type GithubGetContentsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGithubGetContentsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubGetContentsHandler {
	return &GithubGetContentsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GithubGetContentsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-github-get-contents")
	defer span.End()

	request := &types.GetContentsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "invalid request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)
	if !ok {
		err := telemetry.Error(ctx, span, nil, "owner and name params not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	branch, ok := commonutils.GetBranchParam(c, w, r)
	if !ok {
		err := telemetry.Error(ctx, span, nil, "branch param not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	client, err := GetGithubAppClientFromRequest(c.Config(), r)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "could not get github app client from request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "repo-owner", Value: owner},
		telemetry.AttributeKV{Key: "repo-name", Value: name},
		telemetry.AttributeKV{Key: "repo-branch", Value: branch},
	)

	repoContentOptions := github.RepositoryContentGetOptions{}
	repoContentOptions.Ref = branch
	_, directoryContents, resp, err := client.Repositories.GetContents(
		ctx,
		owner,
		name,
		request.Dir,
		&repoContentOptions,
	)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "could not get contents from github")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, resp.StatusCode))
		return
	}

	res := make(types.GetContentsResponse, 0)

	for i := range directoryContents {
		res = append(res, types.GithubDirectoryItem{
			Path: *directoryContents[i].Path,
			Type: *directoryContents[i].Type,
		})
	}

	c.WriteResult(w, r, res)
}
