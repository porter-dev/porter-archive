package porter_app

import (
	"context"
	"encoding/base64"
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
	"google.golang.org/protobuf/reflect/protoreflect"
)

// ListEnvironmentTemplatesHandler handles requests to the /apps/templates endpoint
type ListEnvironmentTemplatesHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewListEnvironmentTemplatesHandler returns a new ListEnvironmentTemplatesHandler
func NewListEnvironmentTemplatesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListEnvironmentTemplatesHandler {
	return &ListEnvironmentTemplatesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// Environment is a partially encoded environment object
type Environment struct {
	// Name is the name of the environment
	Name string `json:"name"`
	// Base64 Apps is a list of apps that are deployed in the environment
	Base64Apps []string `json:"base64_apps,omitempty"`
	// Base64Addons is a list of encoded addons that are deployed in the environment
	Base64Addons []string `json:"base64_addons,omitempty"`
}

// ListEnvironmentTemplatesResponse represents the response from the /apps/templates endpoint
type ListEnvironmentTemplatesResponse struct {
	EnvironmentTemplates []Environment `json:"environment_templates,omitempty"`
}

// ServeHTTP lists all environment templates
func (c *ListEnvironmentTemplatesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-environment-templates")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	listTemplatesReq := connect.NewRequest(&porterv1.ListTemplatesRequest{
		ProjectId: int64(project.ID),
		ClusterId: int64(cluster.ID),
	})

	listTemplatesResp, err := c.Config().ClusterControlPlaneClient.ListTemplates(ctx, listTemplatesReq)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing templates")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if listTemplatesResp == nil || listTemplatesResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "list templates response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	// get all apps for each environment
	var envTemplates []Environment

	for _, env := range listTemplatesResp.Msg.EnvironmentTemplates {
		var encodedApps []string
		for _, app := range env.Apps {
			encoded, err := base64EncodeContractObject(ctx, app)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error encoding app")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}

			encodedApps = append(encodedApps, encoded)
		}

		var encodedAddons []string
		for _, addon := range env.Addons {
			encoded, err := base64EncodeContractObject(ctx, addon)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error encoding addon")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}

			encodedAddons = append(encodedAddons, encoded)
		}

		envTemplates = append(envTemplates, Environment{
			Name:         env.Name,
			Base64Apps:   encodedApps,
			Base64Addons: encodedAddons,
		})
	}

	res := ListEnvironmentTemplatesResponse{
		EnvironmentTemplates: envTemplates,
	}

	c.WriteResult(w, r, res)
}

func base64EncodeContractObject(ctx context.Context, pc protoreflect.ProtoMessage) (string, error) {
	by, err := helpers.MarshalContractObject(ctx, pc)
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(by), nil
}
