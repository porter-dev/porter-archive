package project_integration

import (
	"net/http"

	"connectrpc.com/connect"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// CreatePreflightCheckHandler Create Preflight Checks
type CreatePreflightCheckHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCreatePreflightCheckHandler Create Preflight Checks with /integrations/preflightcheck
func NewCreatePreflightCheckHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreatePreflightCheckHandler {
	return &CreatePreflightCheckHandler{
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

var recognizedPreflightCheckKeys = []string{
	"eip",
	"vcpu",
	"vpc",
	"natGateway",
	"apiEnabled",
	"cidrAvailability",
	"iamPermissions",
	"resourceProviders",
}

func (p *CreatePreflightCheckHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "preflight-checks")
	defer span.End()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	betaFeaturesEnabled := project.GetFeatureFlag(models.BetaFeaturesEnabled, p.Config().LaunchDarklyClient)

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "beta-features-enabled", Value: betaFeaturesEnabled})

	cloudValues := &porterv1.PreflightCheckRequest{}
	err := helpers.UnmarshalContractObjectFromReader(r.Body, cloudValues)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error unmarshalling preflight check data")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusPreconditionFailed, err.Error()))
		return
	}

	var resp PreflightCheckResponse

	input := porterv1.PreflightCheckRequest{
		ProjectId:                  int64(project.ID),
		CloudProvider:              cloudValues.CloudProvider,
		CloudProviderCredentialsId: cloudValues.CloudProviderCredentialsId,
		Contract:                   cloudValues.Contract,
	}

	if cloudValues.PreflightValues != nil {
		if cloudValues.CloudProvider == porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_GCP || cloudValues.CloudProvider == porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS {
			input.PreflightValues = cloudValues.PreflightValues
		}
	}

	checkResp, err := p.Config().ClusterControlPlaneClient.PreflightCheck(ctx, connect.NewRequest(&input))
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

	if !betaFeaturesEnabled {
		p.WriteResult(w, r, checkResp)
		return
	}

	errors := []PreflightCheckError{}
	for key, val := range checkResp.Msg.PreflightChecks {
		if val.Message == "" || !contains(recognizedPreflightCheckKeys, key) {
			continue
		}

		errors = append(errors, PreflightCheckError{
			Name: key,
			Error: PorterError{
				Code:     val.Code,
				Message:  val.Message,
				Metadata: val.Metadata,
			},
		})

	}
	resp.Errors = errors

	p.WriteResult(w, r, resp)
}

func contains(slice []string, elem string) bool {
	for _, item := range slice {
		if item == elem {
			return true
		}
	}
	return false
}
