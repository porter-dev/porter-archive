package gitinstallation

import (
	"context"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm/repo"
)

type GithubGetBranchMetadataHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewGithubGetBranchMetadataHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GithubGetBranchMetadataHandler {
	return &GithubGetBranchMetadataHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GithubGetBranchMetadataHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	branch, ok := commonutils.GetBranchParam(c, w, r)

	if !ok {
		return
	}

	client, err := GetGithubAppClientFromRequest(c.Config(), r)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	branchResp, _, err := client.Repositories.GetBranch(
		context.Background(),
		owner,
		name,
		branch,
		false,
	)

	if err != nil {
		c.HandleAPIError(
			w,
			r,
			apierrors.NewErrPassThroughToClient(fmt.Errorf("Error communicating with the GitHub API. Please try again."),
				http.StatusConflict, fmt.Sprintf("Error getting branch %s for repository %s/%s: %v", branch, owner, name, err))
		)
		return
	}

	branchMeta := &types.GetGithubBranchMetadataResponse{
		Name:          branchResp.GetName(),
		Commit:        branchResp.GetCommit().GetSHA(),
		LastUpdatedAt: branchResp.GetCommit().GetCommit().GetAuthor().GetDate(),
		URL:           branchResp.GetCommit().GetHTMLURL(),
	}

	c.WriteResult(w, r, branchMeta)
}
