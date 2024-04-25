package addons

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// TailscaleServicesHandler handles requests to the /addons/tailscale-services endpoint
type TailscaleServicesHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewAddonHandler returns a new AddonHandler
func NewTailscaleServicesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *TailscaleServicesHandler {
	return &TailscaleServicesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// TailscaleServicesResponse represents the response from the /addons/tailscale-services endpoints
type TailscaleServicesResponse struct {
	Services []TailscaleService `json:"services"`
}

// TailscaleService represents a Tailscale service
type TailscaleService struct {
	Name string `json:"name"`
	IP   string `json:"ip"`
	Port int    `json:"port"`
}

// ServeHTTP returns all services that can be accessed through Tailscale
// TODO: move this logic to CCP
func (c *TailscaleServicesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-tailscale-services")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	deploymentTarget, _ := ctx.Value(types.DeploymentTargetScope).(types.DeploymentTarget)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "namespace", Value: deploymentTarget.Namespace},
		telemetry.AttributeKV{Key: "cluster-id", Value: deploymentTarget.ClusterID},
	)

	cluster, err := c.Repo().Cluster().ReadCluster(project.ID, deploymentTarget.ClusterID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading cluster")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	agent, err := c.GetAgent(r, cluster, deploymentTarget.Namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	svcList, err := agent.ListServices(ctx, deploymentTarget.Namespace, "porter.run/tailscale-svc=true")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing services")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var services []TailscaleService
	for _, svc := range svcList.Items {
		var port int
		if len(svc.Spec.Ports) > 0 {
			port = int(svc.Spec.Ports[0].Port)
		}
		service := TailscaleService{
			Name: svc.Name,
			IP:   svc.Spec.ClusterIP,
			Port: port,
		}
		if appName, ok := svc.Labels["porter.run/app-name"]; ok {
			if serviceName, ok := svc.Labels["porter.run/service-name"]; ok {
				service.Name = fmt.Sprintf("%s (%s)", serviceName, appName)
			}
		}

		services = append(services, service)
	}

	resp := TailscaleServicesResponse{
		Services: services,
	}

	c.WriteResult(w, r, resp)
}
