package project_integration

import (
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
	"github.com/porter-dev/porter/internal/telemetry"
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-aws-integration")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.CreateAWSRequest{}
	if ok := p.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	aws := CreateAWSIntegration(request, project.ID, user.ID)

	aws, err := p.Repo().AWSIntegration().CreateAWSIntegration(aws)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating aws integration")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := types.CreateAWSResponse{
		AWSIntegration: aws.ToAWSIntegrationType(),
	}

	if project.CapiProvisionerEnabled && p.Config().EnableCAPIProvisioner {
		credReq := porterv1.CreateAssumeRoleChainRequest{
			ProjectId:       int64(project.ID),
			SourceArn:       "arn:aws:iam::108458755588:role/CAPIManagement", // hard coded as this is the final hop for a CAPI cluster
			TargetAccessId:  request.AWSAccessKeyID,
			TargetSecretKey: request.AWSSecretAccessKey,
			TargetArn:       request.TargetArn,
			ExternalId:      request.ExternalID,
		}
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "target-arn", Value: request.TargetArn},
			telemetry.AttributeKV{Key: "external-id", Value: request.ExternalID},
			telemetry.AttributeKV{Key: "target-access-id", Value: request.AWSAccessKeyID},
		)
		credResp, err := p.Config().ClusterControlPlaneClient.CreateAssumeRoleChain(ctx, connect.NewRequest(&credReq))
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating CAPI required credential")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusPreconditionFailed, err.Error()))
			return
		}
		res.CloudProviderCredentialIdentifier = credResp.Msg.TargetArn
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cloud-provider-credential-identifier", Value: credResp.Msg.TargetArn})
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
