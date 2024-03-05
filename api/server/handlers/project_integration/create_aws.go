package project_integration

import (
	"net/http"
	"strings"

	"connectrpc.com/connect"
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

	if project.GetFeatureFlag(models.CapiProvisionerEnabled, p.Config().LaunchDarklyClient) {
		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "target-arn", Value: request.TargetArn},
			telemetry.AttributeKV{Key: "external-id", Value: request.ExternalID},
			telemetry.AttributeKV{Key: "target-access-id", Value: request.AWSAccessKeyID},
		)

		if project.GetFeatureFlag(models.AWSACKAuthEnabled, p.Config().LaunchDarklyClient) {
			if request.TargetArn == "" {
				err = telemetry.Error(ctx, span, err, "target arn is required for AWS ACK auth")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest, "target arn is required for AWS ACK auth"))
				return
			}

			// if a user is changing the external ID, then we need to update the external ID for all projects that use that AWS account.
			// This is required since the same AWS account can be used across multiple projects. In order to change the external ID for a project,
			// the user must then have access to all projects that use that AWS account.
			// If we ever do a higher abstraction about porter projects, then we can tie the ability to access a cloud provider account to that higher abstraction.
			awsAccountIdPrefix := strings.TrimPrefix(request.TargetArn, "arn:aws:iam::")
			awsAccountId := strings.TrimSuffix(awsAccountIdPrefix, ":role/porter-manager")
			assumeRoles, err := p.Repo().AWSAssumeRoleChainer().ListByAwsAccountId(ctx, awsAccountId)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error listing assume role chains")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError, "error listing assume role chains"))
				return
			}

			requiredProjects := make(map[int]bool)
			for _, role := range assumeRoles {
				requiredProjects[role.ProjectID] = false
			}

			usersProject, err := p.Repo().Project().ListProjectsByUserID(user.ID)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error listing projects by user id")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError, "error listing projects by user id"))
				return
			}

			for _, project := range usersProject {
				if _, ok := requiredProjects[int(project.ID)]; ok {
					requiredProjects[int(project.ID)] = true
				}
			}

			for proj, required := range requiredProjects {
				if !required {
					err = telemetry.Error(ctx, span, err, "user does not have access to all projects that use this AWS account")
					telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "missing-project", Value: proj})
					p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden, "user does not have access to all projects that use this AWS account"))
					return
				}
			}

			credReq := porterv1.UpdateCloudProviderCredentialsRequest{
				ProjectId:     int64(project.ID),
				CloudProvider: porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS,
				CloudProviderCredentials: &porterv1.UpdateCloudProviderCredentialsRequest_AwsCredentials{
					AwsCredentials: &porterv1.AWSCredentials{
						TargetArn:  request.TargetArn,
						ExternalId: request.ExternalID,
					},
				},
			}

			credResp, err := p.Config().ClusterControlPlaneClient.UpdateCloudProviderCredentials(ctx, connect.NewRequest(&credReq))
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error updating AWS credential")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusPreconditionFailed, err.Error()))
				return
			}
			if credResp == nil {
				err = telemetry.Error(ctx, span, err, "error reading AWS credential response")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusPreconditionFailed, "response is nil"))
				return
			}
			if credResp.Msg == nil {
				err = telemetry.Error(ctx, span, err, "error reading AWS credential message")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusPreconditionFailed, "response message is nil"))
				return
			}
			res.CloudProviderCredentialIdentifier = credResp.Msg.CredentialsIdentifier
			res.PercentCompleted = credResp.Msg.PercentCompleted
		} else {
			credReq := porterv1.CreateAssumeRoleChainRequest{ //nolint:staticcheck // being deprecated by the above UpdateCloudProviderCredentials
				ProjectId:       int64(project.ID),
				SourceArn:       "arn:aws:iam::108458755588:role/CAPIManagement", // hard coded as this is the final hop for a CAPI cluster
				TargetAccessId:  request.AWSAccessKeyID,
				TargetSecretKey: request.AWSSecretAccessKey,
				TargetArn:       request.TargetArn,
				ExternalId:      request.ExternalID,
			}

			credResp, err := p.Config().ClusterControlPlaneClient.CreateAssumeRoleChain(ctx, connect.NewRequest(&credReq)) //nolint:staticcheck // being deprecated by the above UpdateCloudProviderCredentials
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error creating CAPI required credential")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusPreconditionFailed, err.Error()))
				return
			}
			res.CloudProviderCredentialIdentifier = credResp.Msg.TargetArn
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "cloud-provider-credential-identifier", Value: res.CloudProviderCredentialIdentifier})
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
