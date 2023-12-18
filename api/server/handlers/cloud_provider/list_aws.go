package cloud_provider

import (
	"fmt"
	"net/http"

	"github.com/aws/aws-sdk-go/aws/arn"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListAwsResponse describes an outbound response for listing aws accounts on
// a given project.
//
// The shape of the object is "generic" as there will be similar endpoints in
// the future for other cloud providers.
type ListAwsResponse struct {
	// CloudProviderID is the cloud provider id - for AWS, this is an account
	CloudProviderID string `json:"cloud_provider_id"`

	// ProjectID is the project the account is associated with
	ProjectID uint `json:"project_id"`
}

// ListAwsHandler is a struct for handling an aws cloud provider list request
type ListAwsHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

// NewListAwsHandler constructs a ListAwsHandler
func NewListAwsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListAwsHandler {
	return &ListAwsHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP returns a list of AWS Accounts
//
// todo: Move this logic down into CCP
func (c *ListAwsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-cloud-provider-list-aws")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	res := []ListAwsResponse{}
	if !project.GetFeatureFlag(models.CapiProvisionerEnabled, c.Config().LaunchDarklyClient) {
		e := fmt.Errorf("listing cloud providers not available on non-capi clusters")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	dblinks, err := c.Repo().AWSAssumeRoleChainer().List(ctx, project.ID)
	if err != nil {
		e := fmt.Errorf("unable to find assume role chain links: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
		return
	}

	for _, link := range dblinks {
		b, err := arn.Parse(link.TargetARN)
		if err != nil {
			e := fmt.Errorf("unable to parse target arn: %w", err)
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}

		res = append(res, ListAwsResponse{
			CloudProviderID: b.AccountID,
			ProjectID:       uint(link.ProjectID),
		})
	}
	c.WriteResult(w, r, res)
	w.WriteHeader(http.StatusOK)
	return
}
