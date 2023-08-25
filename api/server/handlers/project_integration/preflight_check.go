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

type CreatePreflightCheckHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreatePreflightCheckHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreatePreflightCheckHandler {
	return &CreatePreflightCheckHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreatePreflightCheckHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "preflight-checks")
	defer span.End()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	
	cloudValues := &porterv1.PreflightCheckRequest{}
	err := helpers.UnmarshalContractObjectFromReader(r.Body, cloudValues)
	if err != nil {
		telemetry.Error(ctx, span, err, "error unmarshalling preflight check data")
	}

	// if err := json.NewDecoder(r.Body).Decode(request); err != nil {
	// 	http.Error(w, err.Error(), http.StatusBadRequest)
	// 	return
	// }
	// fmt.Println("HERE", request.CloudValues)

	input := porterv1.PreflightCheckRequest{
		ProjectId:                  int64(project.ID),
		CloudProvider:              cloudValues.CloudProvider,
		CloudProviderCredentialsId: cloudValues.CloudProviderCredentialsId,
	}

	if cloudValues.PreflightValues != nil {
		if cloudValues.CloudProvider == porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_GCP {
			input.PreflightValues =  cloudValues.PreflightValues
		
		}
	}

	checkResp, err := p.Config().ClusterControlPlaneClient.PreflightCheck(ctx, connect.NewRequest(&input))
	if err != nil {
		e := fmt.Errorf("Pre-provision check failed: %w", err)
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusPreconditionFailed, err.Error()))
		return
	}

	p.WriteResult(w, r, checkResp)
}
