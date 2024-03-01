package api_contract

import (
	"net/http"

	"connectrpc.com/connect"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/telemetry"
)

// PreflightCheckHandler runs preflight checks on a cluster contract
type PreflightCheckHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewPreflightCheckHandler returns a new PreflightCheckHandler
func NewPreflightCheckHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PreflightCheckHandler {
	return &PreflightCheckHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// PorterError is the error response for the preflight check endpoint
type PorterError struct {
	Code     string            `json:"code"`
	Message  string            `json:"message"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

// PreflightCheckError is the error response for the preflight check endpoint
type PreflightCheckError struct {
	Name  string      `json:"name"`
	Error PorterError `json:"error"`
}

// PreflightCheckResponse is the response to the preflight check endpoint
type PreflightCheckResponse struct {
	Errors []PreflightCheckError `json:"errors"`
}

func (p *PreflightCheckHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-preflight-checks")
	defer span.End()

	var apiContract porterv1.Contract

	err := helpers.UnmarshalContractObjectFromReader(r.Body, &apiContract)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error parsing api contract")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	var resp PreflightCheckResponse

	req := porterv1.CloudContractPreflightCheckRequest{
		Contract: &apiContract,
	}

	checkResp, err := p.Config().ClusterControlPlaneClient.CloudContractPreflightCheck(ctx, connect.NewRequest(&req))
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error calling preflight checks")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if checkResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "no message received from preflight checks")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	errors := []PreflightCheckError{}
	for _, check := range checkResp.Msg.FailingPreflightChecks {
		errors = append(errors, PreflightCheckError{
			Name: check.Type,
			Error: PorterError{
				Message:  check.Message,
				Metadata: check.Metadata,
			},
		})
	}
	resp.Errors = errors
	p.WriteResult(w, r, resp)
}
