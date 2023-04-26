package gitinstallation

import (
	"context"
	b64 "encoding/base64"
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

type GithubGetPorterYamlHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGithubGetPorterYamlHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubGetPorterYamlHandler {
	return &GithubGetPorterYamlHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GithubGetPorterYamlHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.GetPorterYamlRequest{}

	ok := c.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

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

	resp, _, _, err := client.Repositories.GetContents(
		context.Background(),
		owner,
		name,
		request.Path,
		&github.RepositoryContentGetOptions{
			Ref: branch,
		},
	)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	fileData, err := resp.GetContent()
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	data := b64.StdEncoding.EncodeToString([]byte(fileData))

	c.WriteResult(w, r, data)
}
