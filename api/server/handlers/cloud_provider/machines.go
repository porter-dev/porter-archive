package cloud_provider

import (
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

// CloudProviderMachineTypesHandler checks for available machine types for a given cloud provider, account and region
type CloudProviderMachineTypesHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCloudProviderMachineTypesHandler constructs a CloudProviderMachineTypesHandler
func NewCloudProviderMachineTypesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CloudProviderMachineTypesHandler {
	return &CloudProviderMachineTypesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// CloudProviderMachineTypesRequest is the request object for the CloudProviderMachineTypesHandler
type CloudProviderMachineTypesRequest struct {
	CloudProvider                     string `json:"cloud_provider"`
	CloudProviderCredentialIdentifier string `json:"cloud_provider_credential_identifier"`
	Region                            string `json:"region"`
}

// CloudProviderMachineTypesResponse is the response object for the CloudProviderMachineTypesHandler
type CloudProviderMachineTypesResponse struct {
	MachineTypes            []MachineType `json:"machine_types"`
	UnsupportedMachineTypes []MachineType `json:"unsupported_machine_types"`
}

// MachineType represents a machine type
type MachineType struct {
	Name string `json:"name"`
}

// ServeHTTP handles the cloud provider machine types request
func (c *CloudProviderMachineTypesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-cloud-provider-machines")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &CloudProviderMachineTypesRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "unable to decode and validate request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var resp CloudProviderMachineTypesResponse

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cloud-provider", Value: request.CloudProvider},
		telemetry.AttributeKV{Key: "region", Value: request.Region},
		telemetry.AttributeKV{Key: "cloud-provider-credential-identifier", Value: request.CloudProviderCredentialIdentifier},
	)

	if request.CloudProvider == "" {
		err := telemetry.Error(ctx, span, nil, "cloud provider is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if request.Region == "" {
		err := telemetry.Error(ctx, span, nil, "region is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if request.CloudProviderCredentialIdentifier == "" {
		err := telemetry.Error(ctx, span, nil, "cloud provider credentials id is required")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	req := porterv1.MachineTypesRequest{
		ProjectId:                  int64(project.ID),
		CloudProvider:              translateCloudProvider(request.CloudProvider),
		CloudProviderCredentialsId: request.CloudProviderCredentialIdentifier,
		Region:                     request.Region,
	}

	machineTypesResp, err := c.Config().ClusterControlPlaneClient.MachineTypes(ctx, connect.NewRequest(&req))
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting machine types")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if machineTypesResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "no message received from machine types")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	for _, machineType := range machineTypesResp.Msg.MachineTypes {
		resp.MachineTypes = append(resp.MachineTypes, MachineType{
			Name: machineType.Name,
		})
	}
	for _, machineType := range machineTypesResp.Msg.UnsupportedMachineTypes {
		resp.UnsupportedMachineTypes = append(resp.UnsupportedMachineTypes, MachineType{
			Name: machineType.Name,
		})
	}

	c.WriteResult(w, r, resp)
}

var cloudProviderTranslator = map[string]porterv1.EnumCloudProvider{
	"aws":   porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS,
	"azure": porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AZURE,
	"gcp":   porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_GCP,
}

func translateCloudProvider(cloudProvider string) porterv1.EnumCloudProvider {
	if val, ok := cloudProviderTranslator[strings.ToLower(cloudProvider)]; ok {
		return val
	}

	return porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_UNSPECIFIED
}
