package project_integration

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/api-contracts/generated/go/helpers"

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

// RequestQuotaIncreaseHandler requests quota increase for given a list of quotas
type CreateRequestQuotaIncreaseHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewRequestQuotaIncreaseHandler requests quota increase for given a list of quotas
func NewRequestQuotaIncreaseHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateRequestQuotaIncreaseHandler {
	return &CreateRequestQuotaIncreaseHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreateRequestQuotaIncreaseHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "quota-increase")
	defer span.End()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	quotaIncreaseValues := &porterv1.QuotaIncreaseRequest{}
	err := helpers.UnmarshalContractObjectFromReader(r.Body, quotaIncreaseValues)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error unmarshalling quota check increases")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusPreconditionFailed, err.Error()))
		return
	}

	input := porterv1.QuotaIncreaseRequest{
		ProjectId:                  int64(project.ID),
		CloudProvider:              quotaIncreaseValues.CloudProvider,
		CloudProviderCredentialsId: quotaIncreaseValues.CloudProviderCredentialsId,
		QuotaIncreases:             quotaIncreaseValues.QuotaIncreases,
	}

	if quotaIncreaseValues.PreflightValues != nil {
		if quotaIncreaseValues.CloudProvider == porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_GCP || quotaIncreaseValues.CloudProvider == porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS {
			input.PreflightValues = quotaIncreaseValues.PreflightValues
		}
	}

	checkResp, err := p.Config().ClusterControlPlaneClient.QuotaIncrease(ctx, connect.NewRequest(&input))
	if err != nil {
		e := fmt.Errorf("quota increase request failed: %w", err)
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusPreconditionFailed, err.Error()))
		return
	}

	p.WriteResult(w, r, checkResp)
}
