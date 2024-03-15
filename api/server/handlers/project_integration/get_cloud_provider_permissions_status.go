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

// CloudProviderPermissionsStatusHandler is the handler for checking the status of cloud provider permissions
type CloudProviderPermissionsStatusHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCloudProviderPermissionsStatusHandler returns a handler for checking the status of cloud provider permissions
func NewCloudProviderPermissionsStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CloudProviderPermissionsStatusHandler {
	return &CloudProviderPermissionsStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// CloudProviderType is a type for the cloud provider
type CloudProviderType string

const (
	// CloudProviderAWS is the AWS cloud provider
	CloudProviderAWS CloudProviderType = "AWS"
	// CloudProviderGCP is the GCP cloud provider
	CloudProviderGCP CloudProviderType = "GCP"
	// CloudProviderAzure is the Azure cloud provider
	CloudProviderAzure CloudProviderType = "Azure"
)

// CloudProviderPermissionsStatusRequest is the request to check the status of cloud provider permissions
type CloudProviderPermissionsStatusRequest struct {
	CloudProvider                     CloudProviderType `schema:"cloud_provider"`
	CloudProviderCredentialIdentifier string            `schema:"cloud_provider_credential_identifier"`
}

// CloudProviderPermissionsStatusResponse is the response to check the status of cloud provider permissions
type CloudProviderPermissionsStatusResponse struct {
	PercentCompleted float32 `json:"percent_completed"`
}

// ServeHTTP checks the status of cloud provider permissions
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

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cloud-provider", Value: string(request.CloudProvider)},
		telemetry.AttributeKV{Key: "cloud-provider-credential-identifier", Value: request.CloudProviderCredentialIdentifier},
	)

	if request.CloudProviderCredentialIdentifier == "" {
		err := telemetry.Error(ctx, span, nil, "missing cloud provider credential identifier")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if request.CloudProvider == "" {
		err := telemetry.Error(ctx, span, nil, "missing cloud provider")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var cloudProvider porterv1.EnumCloudProvider
	switch request.CloudProvider {
	case CloudProviderAWS:
		accessErrorExists, err := p.checkSameAccountInDifferentProjects(ctx, request.CloudProviderCredentialIdentifier, user)
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
		cloudProvider = porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS
	}

	credReq := porterv1.CloudProviderPermissionsStatusRequest{
		ProjectId:                         int64(project.ID),
		CloudProvider:                     cloudProvider,
		CloudProviderCredentialIdentifier: request.CloudProviderCredentialIdentifier,
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
