package project_integration

import (
	"context"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

type CreateAWSHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateAWSHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateAWSHandler {
	return &CreateAWSHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreateAWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateAWSRequest{}

	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	aws := CreateAWSIntegration(request, project.ID, user.ID)

	aws, err := p.Repo().AWSIntegration().CreateAWSIntegration(aws)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	aint := aws.ToAWSIntegrationType()

	res := types.CreateAWSResponse{
		AWSIntegration: &aint,
	}

	p.WriteResult(w, r, res)
}

func CreateAWSIntegration(request *types.CreateAWSRequest, projectID, userID uint) *ints.AWSIntegration {
	ctx := context.Background()

	resp := &ints.AWSIntegration{
		UserID:             userID,
		ProjectID:          projectID,
		AWSRegion:          request.AWSRegion,
		AWSAssumeRoleArn:   request.AWSAssumeRoleArn,
		AWSClusterID:       []byte(request.AWSClusterID),
		AWSAccessKeyID:     []byte(request.AWSAccessKeyID),
		AWSSecretAccessKey: []byte(request.AWSSecretAccessKey),
	}

	// attempt to populate the ARN
	resp.PopulateAWSArn(ctx)

	return resp
}
