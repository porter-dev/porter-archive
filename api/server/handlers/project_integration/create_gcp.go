package project_integration

import (
	"encoding/base64"
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/telemetry"
)

type CreateGCPHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateGCPHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateGCPHandler {
	return &CreateGCPHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *CreateGCPHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-gcp-credentials")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.CreateGCPRequest{}

	if ok := p.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if project.GetFeatureFlag("capi_provisioner_enabled", p.Config().LaunchDarklyClient) {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "capi-provisioner-enabled", Value: true})

		b64Key := base64.StdEncoding.EncodeToString([]byte(request.GCPKeyData))

		ccpCredentialsInput := &connect.Request[porterv1.UpdateCloudProviderCredentialsRequest]{
			Msg: &porterv1.UpdateCloudProviderCredentialsRequest{
				ProjectId:     int64(project.ID),
				CloudProvider: porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_GCP,
				CloudProviderCredentials: &porterv1.UpdateCloudProviderCredentialsRequest_GcpCredentials{
					GcpCredentials: &porterv1.GCPCredentials{
						ServiceAccountJsonBase64: b64Key,
					},
				},
			},
		}
		ccpCredentialsResponse, err := p.Config().ClusterControlPlaneClient.UpdateCloudProviderCredentials(ctx, ccpCredentialsInput)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "failed to update cloud provider credentials")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}
		if ccpCredentialsResponse.Msg == nil {
			e := telemetry.Error(ctx, span, nil, "nil response when updating provider credentials")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}

		res := types.CreateGCPResponse{
			IsCCPCluster:                      true,
			CloudProviderCredentialIdentifier: ccpCredentialsResponse.Msg.CredentialsIdentifier,
		}

		p.WriteResult(w, r, res)
		return
	}

	gcp := CreateGCPIntegration(request, project.ID, user.ID)

	gcp, err := p.Repo().GCPIntegration().CreateGCPIntegration(gcp)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := types.CreateGCPResponse{
		GCPIntegration: gcp.ToGCPIntegrationType(),
	}

	p.WriteResult(w, r, res)
}

func CreateGCPIntegration(request *types.CreateGCPRequest, projectID, userID uint) *ints.GCPIntegration {
	resp := &ints.GCPIntegration{
		UserID:       userID,
		ProjectID:    projectID,
		GCPKeyData:   []byte(request.GCPKeyData),
		GCPProjectID: request.GCPProjectID,
		GCPRegion:    request.GCPRegion,
	}

	resp.PopulateGCPMetadata()

	return resp
}
