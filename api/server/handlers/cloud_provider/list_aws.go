package cloud_provider

import (
	"net/http"

	"github.com/aws/aws-sdk-go/aws/arn"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListAwsAccountsResponse describes an outbound response for listing aws accounts on
// a given project.
type ListAwsAccountsResponse struct {
	// Accounts is a list of aws account objects
	Accounts []AwsAccount `json:"accounts"`
}

// AwsAccount describes an outbound response for listing aws accounts on
// a given project.
//
// The shape of the object is "generic" as there will be similar endpoints in
// the future for other cloud providers.
type AwsAccount struct {
	// CloudProviderID is the cloud provider id - for AWS, this is an account
	CloudProviderID string `json:"cloud_provider_id"`

	// ProjectID is the project the account is associated with
	ProjectID uint `json:"project_id"`
}

// CloudProvider is an abstraction for a cloud provider
type CloudProvider struct {
	// Type is the type of the cloud provider
	Type porterv1.EnumCloudProvider `json:"type"`
	// AccountID is the ID of the cloud provider account
	AccountID string `json:"account_id"`
}

// ListAwsAccountsHandler is a struct for handling an aws cloud provider list request
type ListAwsAccountsHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

// NewListAwsAccountsHandler constructs a ListAwsAccountsHandler
func NewListAwsAccountsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListAwsAccountsHandler {
	return &ListAwsAccountsHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP returns a list of AWS Accounts
//
// todo: Move this logic down into CCP
func (c *ListAwsAccountsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-cloud-provider-list-aws")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	res := ListAwsAccountsResponse{
		Accounts: []AwsAccount{},
	}
	if !project.GetFeatureFlag(models.CapiProvisionerEnabled, c.Config().LaunchDarklyClient) {
		err := telemetry.Error(ctx, span, nil, "listing cloud providers not available on non-capi clusters")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	dblinks, err := c.Repo().AWSAssumeRoleChainer().List(ctx, project.ID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "unable to find assume role chain links")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	for _, link := range dblinks {
		targetArn, err := arn.Parse(link.TargetARN)
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "err-target-arn", Value: link.TargetARN})
			err := telemetry.Error(ctx, span, err, "unable to parse target arn")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		account := AwsAccount{
			CloudProviderID: targetArn.AccountID,
			ProjectID:       uint(link.ProjectID),
		}
		if contains(res.Accounts, account) {
			continue
		}

		res.Accounts = append(res.Accounts, account)
	}
	c.WriteResult(w, r, res)
}

// contains will check if the list of AwsAccounts contains the specified account
// TODO: replace this with an upgrade to Go 1.21 in favor of slices.Contains()
func contains(s []AwsAccount, e AwsAccount) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}
