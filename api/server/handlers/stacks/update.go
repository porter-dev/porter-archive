package stacks

import (
	"encoding/base64"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/models"
)

type UpdateStackHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdateStackHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateStackHandler {
	return &UpdateStackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *UpdateStackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &types.CreateStackReleaseRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error decoding request")))
		return
	}

	stackName := request.StackName
	namespace := fmt.Sprintf("porter-stack-%s", stackName)

	helmAgent, err := c.GetHelmAgent(r, cluster, namespace)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error getting helm agent: %w", err)))
		return
	}

	helmRelease, _ := helmAgent.GetRelease(stackName, 0, false)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error getting latest release: %w", err)))
		return
	}

	k8sAgent, err := c.GetAgent(r, cluster, namespace)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error getting k8s agent: %w", err)))
		return
	}

	porterYamlBase64 := request.PorterYAMLBase64
	porterYaml, err := base64.StdEncoding.DecodeString(porterYamlBase64)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error decoding porter yaml: %w", err)))
		return
	}
	imageInfo := request.ImageInfo
	chart, values, err := parse(
		porterYaml,
		imageInfo,
		c.Config(),
		cluster.ProjectID,
		helmRelease.Config,
		helmRelease.Chart.Metadata.Dependencies,
		SubdomainCreateOpts{
			k8sAgent:       k8sAgent,
			dnsRepo:        c.Repo().DNSRecord(),
			powerDnsClient: c.Config().PowerDNSClient,
			appRootDomain:  c.Config().ServerConf.AppRootDomain,
			stackName:      stackName,
		})
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error parsing porter yaml into chart and values: %w", err)))
		return
	}

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error listing registries: %w", err)))
		return
	}

	conf := &helm.InstallChartConfig{
		Chart:      chart,
		Name:       stackName,
		Namespace:  namespace,
		Values:     values,
		Cluster:    cluster,
		Repo:       c.Repo(),
		Registries: registries,
	}

	_, err = helmAgent.UpgradeInstallChart(conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error updating a chart: %s", err.Error()),
			http.StatusBadRequest,
		))

		return
	}
	w.WriteHeader(http.StatusCreated)
}
