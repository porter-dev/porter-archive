package project_integration

import (
	"context"
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
	"github.com/porter-dev/porter/internal/telemetry"
)

type CloudProviderPermissionsStatusHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCloudProviderPermissionsStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CloudProviderPermissionsStatusHandler {
	return &CloudProviderPermissionsStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

type CloudProviderType string

const (
	CloudProviderAWS   CloudProviderType = "AWS"
	CloudProviderGCP   CloudProviderType = "GCP"
	CloudProviderAzure CloudProviderType = "Azure"
)

type Aws struct {
	TargetArn  string `schema:"target_arn"`
	ExternalID string `schema:"external_id"`
}

type Gcp struct {
	ServiceAccountKey string `schema:"service_account_key"`
	GcpProjectId      string `schema:"gcp_project_id"`
}

type Azure struct {
	SubscriptionId      string `schema:"subscription_id"`
	ClientId            string `schema:"client_id"`
	TenantId            string `schema:"tenant_id"`
	ServicePrincipalKey string `schema:"service_principal_key"`
}

type CloudProviderPermissionsStatusRequest struct {
	CloudProvider CloudProviderType `schema:"cloud_provider"`
	Aws
	Gcp
	Azure
}

type CloudProviderPermissionsStatusResponse struct {
	PercentCompleted float32 `json:"percent_completed"`
}

func (p *CloudProviderPermissionsStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-cloud-provider-permissions-status")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &CloudProviderPermissionsStatusRequest{}
	if ok := p.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	credReq := porterv1.CloudProviderPermissionsStatusRequest{
		ProjectId: int64(project.ID),
	}

	switch request.CloudProvider {
	case CloudProviderAWS:
		if request.TargetArn == "" {
			err := telemetry.Error(ctx, span, nil, "target arn is required for AWS ACK auth")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		accessErrorExists, err := p.checkSameAccountInDifferentProjects(ctx, request.TargetArn, user)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error checking if same account exists in different projects")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		if accessErrorExists {
			err = telemetry.Error(ctx, span, err, "user does not have access to all projects")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
			return
		}

		credReq.CloudProvider = porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS
		credReq.CloudProviderCredentials = &porterv1.CloudProviderPermissionsStatusRequest_AwsCredentials{
			AwsCredentials: &porterv1.AWSCredentials{
				TargetArn:  request.Aws.TargetArn,
				ExternalId: request.Aws.ExternalID,
			},
		}
	case CloudProviderGCP:
		credReq.CloudProvider = porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_GCP
		credReq.CloudProviderCredentials = &porterv1.CloudProviderPermissionsStatusRequest_GcpCredentials{
			GcpCredentials: &porterv1.GCPCredentials{
				ServiceAccountJsonBase64: request.Gcp.ServiceAccountKey,
			},
		}
	case CloudProviderAzure:
		credReq.CloudProvider = porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AZURE
		credReq.CloudProviderCredentials = &porterv1.CloudProviderPermissionsStatusRequest_AzureCredentials{
			AzureCredentials: &porterv1.AzureCredentials{
				SubscriptionId:         request.Azure.SubscriptionId,
				TenantId:               request.Azure.TenantId,
				ClientId:               request.Azure.ClientId,
				ServicePrincipalSecret: []byte(request.Azure.ServicePrincipalKey),
			},
		}
	default:
		err := telemetry.Error(ctx, span, nil, "unsupported cloud provider")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	credResp, err := p.Config().ClusterControlPlaneClient.CloudProviderPermissionsStatus(ctx, connect.NewRequest(&credReq))
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error checking cloud provider permissions status")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if credResp == nil {
		err = telemetry.Error(ctx, span, err, "error reading cloud provider permissions response")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if credResp.Msg == nil {
		err = telemetry.Error(ctx, span, err, "error reading cloud provider permissions message")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	res := CloudProviderPermissionsStatusResponse{
		PercentCompleted: credResp.Msg.PercentCompleted,
	}

	p.WriteResult(w, r, res)
}

func (p *CloudProviderPermissionsStatusHandler) checkSameAccountInDifferentProjects(ctx context.Context, targetArn string, user *models.User) (bool, error) {
	ctx, span := telemetry.NewSpan(ctx, "check-same-account-in-different-projects")
	defer span.End()

	// if a user is changing the external ID, then we need to update the external ID for all projects that use that AWS account.
	// This is required since the same AWS account can be used across multiple projects. In order to change the external ID for a project,
	// the user must then have access to all projects that use that AWS account.
	// If we ever do a higher abstraction about porter projects, then we can tie the ability to access a cloud provider account to that higher abstraction.
	awsAccountIdPrefix := strings.TrimPrefix(targetArn, "arn:aws:iam::")
	awsAccountId := strings.TrimSuffix(awsAccountIdPrefix, ":role/porter-manager")
	assumeRoles, err := p.Repo().AWSAssumeRoleChainer().ListByAwsAccountId(ctx, awsAccountId)
	if err != nil {
		return false, telemetry.Error(ctx, span, err, "error listing assume role chains")
	}

	requiredProjects := make(map[int]bool)
	for _, role := range assumeRoles {
		requiredProjects[role.ProjectID] = false
	}

	usersProject, err := p.Repo().Project().ListProjectsByUserID(user.ID)
	if err != nil {
		return false, telemetry.Error(ctx, span, err, "error listing projects by user id")
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
			return true, err
		}
	}

	return false, nil
}
