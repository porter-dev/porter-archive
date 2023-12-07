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

// ListAwsResponse describes an inbound cloud provider request
type ListAwsResponse struct {
	// AccountID is the cloud provider account id
	AccountID string `json:"account_id"`

	// ProjectID is the project the account is associated with
	ProjectID uint `json:"project_id"`
}

// ListAwsHandler is a struct for handling an account request
type ListAwsHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

// NewListAwsHandler constructs a account ListAwsHandler
func NewListAwsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListAwsHandler {
	return &ListAwsHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

// ServeHTTP returns a list of ListAWSResponse objects
//
// todo: Move this logic down into CCP. Implemented here until a pattern is formed.
func (c *ListAwsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-cloud-provider-list-aws")
	defer span.End()

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	res := []ListAwsResponse{}
	if project.GetFeatureFlag(models.CapiProvisionerEnabled, c.Config().LaunchDarklyClient) {
		dblinks, err := c.Repo().AWSAssumeRoleChainer().List(ctx, project.ID)
		if err != nil {
			e := fmt.Errorf("unable to find assume role chain links: %w", err)
			c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}

		for _, link := range dblinks {
			b, err := arn.Parse(link.TargetARN)
			if err != nil {
				e := fmt.Errorf("unable to parse target arn: %w", err)
				c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
				return
			}

			res = append(res, ListAwsResponse{
				AccountID: b.AccountID,
				ProjectID: uint(link.ProjectID),
			})
		}
		c.WriteResult(w, r, res)
		w.WriteHeader(http.StatusOK)
		return
	}

	awsInts, err := c.Repo().AWSIntegration().ListAWSIntegrationsByProjectID(project.ID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	for _, awsInt := range awsInts {
		b, err := arn.Parse(awsInt.AWSArn)
		if err != nil {
			e := fmt.Errorf("unable to parse target arn: %w", err)
			c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}

		res = append(res, ListAwsResponse{
			AccountID: b.AccountID,
			ProjectID: awsInt.ProjectID,
		})
	}

	c.WriteResult(w, r, res)
}
