package gitinstallation

import (
	"context"
	b64 "encoding/base64"
	"net/http"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/porter_app"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
	"gopkg.in/yaml.v2"
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-porter-yaml")
	defer span.End()
	request := &types.GetPorterYamlRequest{}
	ok := c.DecodeAndValidate(w, r, request)
	if !ok {
		err := telemetry.Error(ctx, span, nil, "invalid request body")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "path", Value: request.Path})

	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)
	if !ok {
		err := telemetry.Error(ctx, span, nil, "unable to get owner and name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	branch, ok := commonutils.GetBranchParam(c, w, r)
	if !ok {
		err := telemetry.Error(ctx, span, nil, "unable to get branch")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	client, err := GetGithubAppClientFromRequest(c.Config(), r)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to get github app client")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
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
		err = telemetry.Error(ctx, span, err, "unable to get contents")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	fileData, err := resp.GetContent()
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to get file data")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	parsed := &porter_app.PorterStackYAML{}
	err = yaml.Unmarshal([]byte(fileData), parsed)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "invalid porter yaml format")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	// backwards compatibility so that old porter yamls are no longer valid
	if parsed.Version != nil {
		version := *parsed.Version
		if version != "v1stack" {
			err = telemetry.Error(ctx, span, nil, "porter YAML version is not supported")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
	}

	data := b64.StdEncoding.EncodeToString([]byte(fileData))
	c.WriteResult(w, r, data)
}
