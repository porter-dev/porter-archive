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

type CreatePreflightCheckAWSHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreatePreflightCheckAWSHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreatePreflightCheckAWSHandler {
	return &CreatePreflightCheckAWSHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreatePreflightCheckAWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	ctx := r.Context()

	request := &types.RolePreflightCheckRequest{}
	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	res := types.RolePreflightCheckResponse{
		TargetARN: 	     request.TargetARN,
	}

	checkReq := porterv1.RolePreflightCheckRequest{
		ProjectID:       int64(project.ID),
		TargetARN:		 request.TargetARN,
		ExternalID: 	 request.ExternalID,
	}

	checkResp, err := p.Config().ClusterControlPlaneClient.RolePreflightCheck(ctx, connect.NewRequest(&checkReq))

	if err != nil {
		e := fmt.Errorf("preflight check failed: %w", err)
		p.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}
	
	res.TargetARN = checkResp.Msg.TargetArn

	p.WriteResult(w, r, checkResp)
}