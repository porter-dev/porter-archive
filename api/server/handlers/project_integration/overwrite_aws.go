package project_integration

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type OverwriteAWSHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewOverwriteAWSHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *OverwriteAWSHandler {
	return &OverwriteAWSHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *OverwriteAWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.OverwriteAWSRequest{}

	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// read the aws integration by ID and overwrite the access id/secret
	awsIntegration, err := p.Repo().AWSIntegration().ReadAWSIntegration(project.ID, request.AWSIntegrationID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	awsIntegration.AWSAccessKeyID = []byte(request.AWSAccessKeyID)
	awsIntegration.AWSSecretAccessKey = []byte(request.AWSSecretAccessKey)

	// handle write to the database
	awsIntegration, err = p.Repo().AWSIntegration().OverwriteAWSIntegration(awsIntegration)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if request.ClusterID > 0 {
		cluster, err := p.Repo().Cluster().ReadCluster(project.ID, request.ClusterID)

		// clear the token
		cluster.TokenCache.Token = []byte("")

		cluster, err = p.Repo().Cluster().UpdateClusterTokenCache(&cluster.TokenCache)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	// app.Logger.Info().Msgf("AWS integration overwritten: %d", awsIntegration.ID)
	aint := awsIntegration.ToAWSIntegrationType()

	res := types.OverwriteAWSResponse{
		AWSIntegration: &aint,
	}

	p.WriteResult(w, r, res)
}
