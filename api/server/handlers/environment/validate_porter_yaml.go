package environment

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/integrations/preview"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type ValidatePorterYAMLHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewValidatePorterYAMLHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ValidatePorterYAMLHandler {
	return &ValidatePorterYAMLHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ValidatePorterYAMLHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	envID, reqErr := requestutils.GetURLParamUint(r, "environment_id")

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	req := &types.ValidatePorterYAMLRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		return
	}

	env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, envID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no such environment with ID: %d", envID)))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error reading environment with ID: %d. Error: %w", envID, err)))
		return
	}

	ghClient, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &types.ValidatePorterYAMLResponse{
		Errors: []string{},
	}

	if req.Branch == "" { // get the default branch name
		repo, _, err := ghClient.Repositories.Get(r.Context(), env.GitRepoOwner, env.GitRepoName)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		req.Branch = repo.GetDefaultBranch()
	}

	fileContents, _, ghResp, err := ghClient.Repositories.GetContents(
		context.Background(), env.GitRepoOwner, env.GitRepoName, "porter.yaml",
		&github.RepositoryContentGetOptions{
			Ref: req.Branch,
		},
	)

	if ghResp.StatusCode == 404 {
		res.Errors = append(res.Errors, preview.ErrNoPorterYAMLFile.Error())
		c.WriteResult(w, r, res)
		return
	}

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	contents, err := fileContents.GetContent()

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if strings.TrimSpace(contents) == "" {
		res.Errors = append(res.Errors, preview.ErrEmptyPorterYAMLFile.Error())
		c.WriteResult(w, r, res)
		return
	}

	for _, err := range preview.Validate(contents) {
		if err != nil {
			res.Errors = append(res.Errors, err.Error())
		}
	}

	c.WriteResult(w, r, res)
}
