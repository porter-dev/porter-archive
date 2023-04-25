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
)

type CreatePreflightCheckAWSUsageHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreatePreflightCheckAWSUsageHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreatePreflightCheckAWSUsageHandler {
	return &CreatePreflightCheckAWSUsageHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreatePreflightCheckAWSUsageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !p.Config().EnableCAPIProvisioner {
		message := "Trying to run preflight checks but CAPI Provisioner is disabled. If you want to provision through CAPI, make sure that your environment variables are set to true"
		e := fmt.Errorf(message)
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusServiceUnavailable, message))
		return
	}

	request := &types.QuotaPreflightCheckRequest{}
	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	checkReq := porterv1.QuotaPreflightCheckRequest{
		ProjectId: int64(project.ID),
		TargetArn: request.TargetARN,
		Region:    request.Region,
	}

	checkResp, err := p.Config().ClusterControlPlaneClient.QuotaPreflightCheck(ctx, connect.NewRequest(&checkReq))
	if err != nil {
		e := fmt.Errorf("Pre-provision check failed: %w", err)
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusPreconditionFailed, err.Error()))
		return
	}

	p.WriteResult(w, r, checkResp)
}
