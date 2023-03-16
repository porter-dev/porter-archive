package project_integration

import (
	"fmt"
	"net/http"

	"github.com/bufbuild/connect-go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
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
	ctx := r.Context()

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

	res := types.CreateAWSResponse{
		AWSIntegration: aws.ToAWSIntegrationType(),
	}

	if !p.Config().DisableCAPIProvisioner {
		credReq := porterv1.CreateAssumeRoleChainRequest{
			ProjectId:       int64(project.ID),
			SourceArn:       "arn:aws:iam::108458755588:role/CAPIManagement", // hard coded as this is the final hop for a CAPI cluster
			TargetAccessId:  request.AWSAccessKeyID,
			TargetSecretKey: request.AWSSecretAccessKey,
		}
		credResp, err := p.Config().ClusterControlPlaneClient.CreateAssumeRoleChain(ctx, connect.NewRequest(&credReq))
		if err != nil {
			e := fmt.Errorf("unable to create CAPI required credential: %w", err)
			p.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}
		res.CloudProviderCredentialIdentifier = credResp.Msg.TargetArn
	}

	p.WriteResult(w, r, res)
}

func CreateAWSIntegration(request *types.CreateAWSRequest, projectID, userID uint) *ints.AWSIntegration {
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
	resp.PopulateAWSArn()

	return resp
}
