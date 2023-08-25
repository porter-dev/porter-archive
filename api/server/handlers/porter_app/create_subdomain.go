package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/domain"
	"github.com/porter-dev/porter/internal/models"
)

// CreateSubdomainHandler handles requests to the /apps/{porter_app_name}/subdomain endpoint
type CreateSubdomainHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewCreateSubdomainHandler returns a new CreateSubdomainHandler
func NewCreateSubdomainHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateSubdomainHandler {
	return &CreateSubdomainHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// CreateSubdomainRequest is the request object for the /apps/{porter_app_name}/subdomain endpoint
type CreateSubdomainRequest struct {
	ServiceName string `schema:"service_name"`
}

// CreateSubdomainResponse is the response object for the /apps/{porter_app_name}/subdomain endpoint
type CreateSubdomainResponse struct {
	// Subdomain is the url for the created subdomain
	Subdomain string `json:"subdomain"`
}

// ServeHTTP creates a subdomain for the provided service and returns it
func (c *CreateSubdomainHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-subdomain")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	name, _ := requestutils.GetURLParamString(r, types.URLParamPorterAppName)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
		telemetry.AttributeKV{Key: "app-name", Value: name},
	)

	request := &CreateSubdomainRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if request.ServiceName == "" {
		err := telemetry.Error(ctx, span, nil, "service name cannot be empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: request.ServiceName})

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err := telemetry.Error(ctx, span, nil, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if agent == nil {
		err := telemetry.Error(ctx, span, nil, "agent is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	endpoint, found, err := domain.GetNGINXIngressServiceIP(agent.Clientset)
	if err != nil {
		err := telemetry.Error(ctx, span, nil, "error getting nginx ingress service ip")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if !found {
		err := telemetry.Error(ctx, span, nil, "nginx ingress service ip not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if endpoint == "" {
		err := telemetry.Error(ctx, span, nil, "nginx ingress service ip is empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "nginx-ingress-ip", Value: endpoint})

	createDomain := domain.CreateDNSRecordConfig{
		ReleaseName: request.ServiceName,
		RootDomain:  c.Config().ServerConf.AppRootDomain,
		Endpoint:    endpoint,
	}

	record := createDomain.NewDNSRecordForEndpoint()
	if record == nil {
		err := telemetry.Error(ctx, span, nil, "dns record is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "host-name", Value: record.Hostname})

	record, err = c.Repo().DNSRecord().CreateDNSRecord(record)
	if err != nil {
		err := telemetry.Error(ctx, span, nil, "error creating dns record")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if record == nil {
		err := telemetry.Error(ctx, span, nil, "dns record is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	_record := domain.DNSRecord(*record)

	if c.Config().PowerDNSClient == nil {
		err := telemetry.Error(ctx, span, nil, "powerdns client is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	err = _record.CreateDomain(c.Config().PowerDNSClient)
	if err != nil {
		err := telemetry.Error(ctx, span, nil, "error creating domain")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	resp := &CreateSubdomainResponse{
		Subdomain: _record.Hostname,
	}

	c.WriteResult(w, r, resp)
}
