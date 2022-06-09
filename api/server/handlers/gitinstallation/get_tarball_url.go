package gitinstallation

import (
	"context"
	"net/http"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type GithubGetTarballURLHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGithubGetTarballURLHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubGetTarballURLHandler {
	return &GithubGetTarballURLHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GithubGetTarballURLHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
		context.TODO(),
		owner,
		name,
		branch,
		false,
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	ghURL, _, err := client.Repositories.GetArchiveLink(
		context.TODO(),
		owner,
		name,
		github.Zipball,
		&github.RepositoryContentGetOptions{
			Ref: *branchResp.Commit.SHA,
		},
		false,
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	apiResp := &types.GetTarballURLResponse{
		URLString:       ghURL.String(),
		LatestCommitSHA: *branchResp.Commit.SHA,
	}

	c.WriteResult(w, r, apiResp)
}
