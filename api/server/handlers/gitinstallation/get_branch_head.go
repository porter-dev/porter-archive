package gitinstallation

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/telemetry"
)

type GetBranchHeadHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetBranchHeadHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetBranchHeadHandler {
	return &GetBranchHeadHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// GetBranchHeadResponse is the response object for the /{branch}/head endpoint
type GetBranchHeadResponse struct {
	CommitSHA string `json:"commit_sha"`
}

// ServeHTTP retrieves the head commit sha for a branch
func (c *GetBranchHeadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-branch-head")
	defer span.End()

	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		err := telemetry.Error(ctx, span, nil, "could not get owner and name from request")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "owner", Value: owner},
		telemetry.AttributeKV{Key: "name", Value: name},
	)

	branchName, ok := commonutils.GetBranchParam(c, w, r)
	if !ok {
		err := telemetry.Error(ctx, span, nil, "unable to get branch name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	client, err := GetGithubAppClientFromRequest(c.Config(), r)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "could not get github app client")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	branch, _, err := client.Repositories.GetBranch(ctx, owner, name, branchName, true)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "could not get branch")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	response := &GetBranchHeadResponse{
		CommitSHA: *branch.Commit.SHA,
	}

	c.WriteResult(w, r, response)
}
