package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type CreateClusterCandidateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateClusterCandidateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateClusterCandidateHandler {
	return &CreateClusterCandidateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreateClusterCandidateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project from context
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	request := &types.CreateClusterCandidateRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	ccs, err := getClusterCandidateModelsFromRequest(c.Repo(), proj, request, c.Config().ServerConf.IsLocal)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make(types.CreateClusterCandidateResponse, 0)

	for _, cc := range ccs {
		// handle write to the database
		cc, err = c.Repo().Cluster().CreateClusterCandidate(cc)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		// if the ClusterCandidate does not have any actions to perform, create the Cluster
		// automatically
		if len(cc.Resolvers) == 0 {
			_, cc, err = createClusterFromCandidate(c.Repo(), proj, user, cc)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		}

		res = append(res, cc.ToClusterCandidateType())
	}

	c.WriteResult(w, r, res)
}

func getClusterCandidateModelsFromRequest(
	repo repository.Repository,
	project *models.Project,
	request *types.CreateClusterCandidateRequest,
	isServerLocal bool,
) ([]*models.ClusterCandidate, error) {
	candidates, err := kubernetes.GetClusterCandidatesFromKubeconfig(
		[]byte(request.Kubeconfig),
		project.ID,
		// can only use "local" auth mechanism if the server is running locally
		isServerLocal && request.IsLocal,
	)

	if err != nil {
		return nil, err
	}

	for _, cc := range candidates {
		cc.ProjectID = project.ID
	}

	return candidates, nil
}
