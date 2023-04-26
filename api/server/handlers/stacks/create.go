package stacks

import (
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
	"github.com/stefanmcshane/helm/pkg/chart"
)

type CreateStackHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateStackHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateStackHandler {
	return &CreateStackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateStackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &types.CreateStackReleaseRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error decoding request")))
		return
	}
	stackName := request.StackName
	namespace := fmt.Sprintf("porter-stack-%s", stackName)

	porterYaml := request.PorterYAML
	imageInfo := request.ImageInfo
	chart_test, values_test, err := parse(porterYaml, &imageInfo, c.Config(), cluster.ProjectID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error with test: %w", err)))
		return
	}
	fmt.Println("here is the chart metadata: ")
	fmt.Printf("%+v\n", *chart_test.Metadata)
	fmt.Println("here are the values: ")
	fmt.Printf("%+v\n", values_test)

	helmAgent, err := c.GetHelmAgent(r, cluster, namespace)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error getting helm agent: %w", err)))
		return
	}

	k8sAgent, err := c.GetAgent(r, cluster, namespace)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error getting k8s agent: %w", err)))
		return
	}

	// create the namespace if it does not exist already
	_, err = k8sAgent.CreateNamespace(namespace, nil)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating namespace: %w", err)))
		return
	}

	// chart, err := createChartFromDependencies(request.Dependencies)
	// if err != nil {
	// 	c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating chart: %w", err)))
	// 	return
	// }

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error listing registries: %w", err)))
		return
	}

	conf := &helm.InstallChartConfig{
		Chart:      chart_test,
		Name:       stackName,
		Namespace:  namespace,
		Values:     values_test,
		Cluster:    cluster,
		Repo:       c.Repo(),
		Registries: registries,
	}

	_, err = helmAgent.InstallChart(conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error installing a new chart: %s", err.Error()),
			http.StatusBadRequest,
		))

		return
	}
	w.WriteHeader(http.StatusCreated)
}

func createChartFromDependencies(deps []types.Dependency) (*chart.Chart, error) {
	metadata := &chart.Metadata{
		Name:        "umbrella",
		Description: "Web application that is exposed to external traffic.",
		Version:     "0.96.0",
		APIVersion:  "v2",
		Home:        "https://getporter.dev/",
		Icon:        "https://user-images.githubusercontent.com/65516095/111255214-07d3da80-85ed-11eb-99e2-fddcbdb99bdb.png",
		Keywords: []string{
			"porter",
			"application",
			"service",
			"umbrella",
		},
		Type:         "application",
		Dependencies: createChartDependencies(deps),
	}

	// create a new chart object with the metadata
	c := &chart.Chart{
		Metadata: metadata,
	}
	return c, nil
}

func createChartDependencies(deps []types.Dependency) []*chart.Dependency {
	var chartDependencies []*chart.Dependency
	for _, d := range deps {
		chartDependencies = append(chartDependencies, &chart.Dependency{
			Name:       d.Name,
			Alias:      d.Alias,
			Version:    d.Version,
			Repository: d.Repository,
		})
	}
	return chartDependencies
}
