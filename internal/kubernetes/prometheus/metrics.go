package prometheus

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// returns the prometheus service name
func GetPrometheusService(clientset kubernetes.Interface) (*v1.Service, bool, error) {
	services, err := clientset.CoreV1().Services("").List(context.TODO(), metav1.ListOptions{
		LabelSelector: "app=prometheus,component=server,heritage=Helm",
	})

	if err != nil {
		return nil, false, err
	}

	if len(services.Items) == 0 {
		return nil, false, nil
	}

	return &services.Items[0], true, nil
}

type SimpleIngress struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

// GetIngressesWithNGINXAnnotation gets an array of names for all ingresses controlled by
// NGINX
func GetIngressesWithNGINXAnnotation(clientset kubernetes.Interface) ([]SimpleIngress, error) {
	ingressList, err := clientset.NetworkingV1beta1().Ingresses("").List(context.TODO(), metav1.ListOptions{})

	if err != nil {
		return nil, err
	}

	res := make([]SimpleIngress, 0)

	for _, ingress := range ingressList.Items {
		if ingressAnn, found := ingress.ObjectMeta.Annotations["kubernetes.io/ingress.class"]; found {
			if ingressAnn == "nginx" {
				res = append(res, SimpleIngress{
					Name:      ingress.ObjectMeta.Name,
					Namespace: ingress.ObjectMeta.Namespace,
				})
			}
		}
	}

	return res, nil
}

type QueryOpts struct {
	Metric     string   `schema:"metric"`
	ShouldSum  bool     `schema:"shouldsum"`
	Kind       string   `schema:"kind"`
	PodList    []string `schema:"pods"`
	Name       string   `schema:"name"`
	Namespace  string   `schema:"namespace"`
	StartRange uint     `schema:"startrange"`
	EndRange   uint     `schema:"endrange"`
	Resolution string   `schema:"resolution"`
}

func QueryPrometheus(
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *QueryOpts,
) ([]byte, error) {
	if len(service.Spec.Ports) == 0 {
		return nil, fmt.Errorf("prometheus service has no exposed ports to query")
	}

	podSelectionRegex, err := getPodSelectionRegex(opts.Kind, opts.Name)

	if err != nil {
		return nil, err
	}

	var podSelector string

	if len(opts.PodList) > 0 {
		podSelector = fmt.Sprintf(`namespace="%s",pod=~"%s",container!="POD",container!=""`, opts.Namespace, strings.Join(opts.PodList, "|"))
	} else {
		podSelector = fmt.Sprintf(`namespace="%s",pod=~"%s",container!="POD",container!=""`, opts.Namespace, podSelectionRegex)
	}

	query := ""

	if opts.Metric == "cpu" {
		query = fmt.Sprintf("rate(container_cpu_usage_seconds_total{%s}[5m])", podSelector)
	} else if opts.Metric == "memory" {
		query = fmt.Sprintf("container_memory_usage_bytes{%s}", podSelector)
	} else if opts.Metric == "network" {
		netPodSelector := fmt.Sprintf(`namespace="%s",pod=~"%s",container="POD"`, opts.Namespace, podSelectionRegex)
		query = fmt.Sprintf("rate(container_network_receive_bytes_total{%s}[5m])", netPodSelector)
	} else if opts.Metric == "nginx:errors" {
		num := fmt.Sprintf(`sum(rate(nginx_ingress_controller_requests{status=~"5.*",namespace="%s",ingress=~"%s"}[5m]) OR on() vector(0))`, opts.Namespace, podSelectionRegex)
		denom := fmt.Sprintf(`sum(rate(nginx_ingress_controller_requests{namespace="%s",ingress=~"%s"}[5m]) > 0)`, opts.Namespace, podSelectionRegex)
		query = fmt.Sprintf(`%s / %s * 100 OR on() vector(0)`, num, denom)
	} else if opts.Metric == "cpu_hpa_threshold" {
		// get the name of the kube hpa metric
		metricName := getKubeHPAMetricName(clientset, service, opts, "spec_target_metric")

		query = createHPAAbsoluteCPUThresholdQuery(metricName, podSelectionRegex, opts.Name, opts.Namespace, service.ObjectMeta.Labels["app"])
	} else if opts.Metric == "memory_hpa_threshold" {
		metricName := getKubeHPAMetricName(clientset, service, opts, "spec_target_metric")

		query = createHPAAbsoluteMemoryThresholdQuery(metricName, podSelectionRegex, opts.Name, opts.Namespace, service.ObjectMeta.Labels["app"])
	} else if opts.Metric == "hpa_replicas" {
		metricName := getKubeHPAMetricName(clientset, service, opts, "status_current_replicas")

		query = createHPACurrentReplicasQuery(metricName, opts.Name, opts.Namespace, service.ObjectMeta.Labels["app"])
	}

	if opts.ShouldSum {
		query = fmt.Sprintf("sum(%s)", query)
	}

	queryParams := map[string]string{
		"query": query,
		"start": fmt.Sprintf("%d", opts.StartRange),
		"end":   fmt.Sprintf("%d", opts.EndRange),
		"step":  opts.Resolution,
	}

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/api/v1/query_range",
		queryParams,
	)

	rawQuery, err := resp.DoRaw(context.TODO())

	if err != nil {
		return nil, err
	}

	return parseQuery(rawQuery, opts.Metric)
}

type promRawQuery struct {
	Data struct {
		Result []struct {
			Metric struct {
				Pod string `json:"pod,omitempty"`
			} `json:"metric,omitempty"`

			Values [][]interface{} `json:"values"`
		} `json:"result"`
	} `json:"data"`
}

type promParsedSingletonQueryResult struct {
	Date     interface{} `json:"date,omitempty"`
	CPU      interface{} `json:"cpu,omitempty"`
	Replicas interface{} `json:"replicas,omitempty"`
	Memory   interface{} `json:"memory,omitempty"`
	Bytes    interface{} `json:"bytes,omitempty"`
	ErrorPct interface{} `json:"error_pct,omitempty"`
}

type promParsedSingletonQuery struct {
	Pod     string                           `json:"pod,omitempty"`
	Results []promParsedSingletonQueryResult `json:"results"`
}

func parseQuery(rawQuery []byte, metric string) ([]byte, error) {
	rawQueryObj := &promRawQuery{}

	json.Unmarshal(rawQuery, rawQueryObj)

	res := make([]*promParsedSingletonQuery, 0)

	for _, result := range rawQueryObj.Data.Result {
		singleton := &promParsedSingletonQuery{
			Pod: result.Metric.Pod,
		}

		singletonResults := make([]promParsedSingletonQueryResult, 0)

		for _, values := range result.Values {
			singletonResult := &promParsedSingletonQueryResult{
				Date: values[0],
			}

			if metric == "cpu" {
				singletonResult.CPU = values[1]
			} else if metric == "memory" {
				singletonResult.Memory = values[1]
			} else if metric == "network" {
				singletonResult.Bytes = values[1]
			} else if metric == "nginx:errors" {
				singletonResult.ErrorPct = values[1]
			} else if metric == "cpu_hpa_threshold" {
				singletonResult.CPU = values[1]
			} else if metric == "memory_hpa_threshold" {
				singletonResult.Memory = values[1]
			} else if metric == "hpa_replicas" {
				singletonResult.Replicas = values[1]
			}

			singletonResults = append(singletonResults, *singletonResult)
		}

		singleton.Results = singletonResults

		res = append(res, singleton)
	}

	return json.Marshal(res)
}

func getPodSelectionRegex(kind, name string) (string, error) {
	var suffix string

	switch strings.ToLower(kind) {
	case "deployment":
		suffix = "[a-z0-9]+-[a-z0-9]+"
	case "statefulset":
		suffix = "[0-9]+"
	case "job":
		suffix = "[a-z0-9]+"
	case "cronjob":
		suffix = "[a-z0-9]+-[a-z0-9]+"
	default:
		return "", fmt.Errorf("not a supported controller to query for metrics")
	}

	return fmt.Sprintf("%s-%s", name, suffix), nil
}

func createHPAAbsoluteCPUThresholdQuery(metricName, podSelectionRegex, hpaName, namespace, appLabel string) string {
	kubeMetricsPodSelector := getKubeMetricsPodSelector(podSelectionRegex, namespace)

	kubeMetricsHPASelector := fmt.Sprintf(
		`hpa="%s",namespace="%s",metric_name="cpu",metric_target_type="utilization"`,
		hpaName,
		namespace,
	)

	// the kube-state-metrics queries are less prone to error if the field app_kubernetes_io_instance is matched
	// as well
	if appLabel != "" {
		kubeMetricsPodSelector += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
		kubeMetricsHPASelector += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
	}

	requestCPU := fmt.Sprintf(
		`sum by (hpa) (label_replace(kube_pod_container_resource_requests_cpu_cores{%s},"hpa", "%s", "", ""))`,
		kubeMetricsPodSelector,
		hpaName,
	)

	targetCPUUtilThreshold := fmt.Sprintf(
		`%s{%s} / 100`,
		metricName,
		kubeMetricsHPASelector,
	)

	return fmt.Sprintf(`%s * on(hpa) %s`, requestCPU, targetCPUUtilThreshold)
}

func createHPAAbsoluteMemoryThresholdQuery(metricName, podSelectionRegex, hpaName, namespace, appLabel string) string {
	kubeMetricsPodSelector := getKubeMetricsPodSelector(podSelectionRegex, namespace)

	kubeMetricsHPASelector := fmt.Sprintf(
		`hpa="%s",namespace="%s",metric_name="memory",metric_target_type="utilization"`,
		hpaName,
		namespace,
	)

	// the kube-state-metrics queries are less prone to error if the field app_kubernetes_io_instance is matched
	// as well
	if appLabel != "" {
		kubeMetricsPodSelector += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
		kubeMetricsHPASelector += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
	}

	requestMem := fmt.Sprintf(
		`sum by (hpa) (label_replace(kube_pod_container_resource_requests_memory_bytes{%s},"hpa", "%s", "", ""))`,
		kubeMetricsPodSelector,
		hpaName,
	)

	targetMemUtilThreshold := fmt.Sprintf(
		`%s{%s} / 100`,
		metricName,
		kubeMetricsHPASelector,
	)

	return fmt.Sprintf(`%s * on(hpa) %s`, requestMem, targetMemUtilThreshold)
}

func getKubeMetricsPodSelector(podSelectionRegex, namespace string) string {
	return fmt.Sprintf(
		`pod=~"%s",namespace="%s",container!="POD",container!=""`,
		podSelectionRegex,
		namespace,
	)
}

func createHPACurrentReplicasQuery(metricName, hpaName, namespace, appLabel string) string {
	kubeMetricsHPASelector := fmt.Sprintf(
		`hpa="%s",namespace="%s"`,
		hpaName,
		namespace,
	)

	// the kube-state-metrics queries are less prone to error if the field app_kubernetes_io_instance is matched
	// as well
	if appLabel != "" {
		kubeMetricsHPASelector += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
	}

	return fmt.Sprintf(
		`%s{%s}`,
		metricName,
		kubeMetricsHPASelector,
	)
}

type promRawValuesQuery struct {
	Status string   `json:"status"`
	Data   []string `json:"data"`
}

// getKubeHPAMetricName performs a "best guess" for the name of the kube HPA metric,
// which was renamed to kube_horizontal_pod_autoscaler... in later versions of kube-state-metrics.
// we query Prometheus for a list of metric names to see if any match the new query
// value, otherwise we return the deprecated name.
func getKubeHPAMetricName(
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *QueryOpts,
	suffix string,
) string {
	queryParams := map[string]string{
		"match[]": fmt.Sprintf("kube_horizontal_pod_autoscaler_%s", suffix),
		"start":   fmt.Sprintf("%d", opts.StartRange),
		"end":     fmt.Sprintf("%d", opts.EndRange),
	}

	resp := clientset.CoreV1().Services(service.Namespace).ProxyGet(
		"http",
		service.Name,
		fmt.Sprintf("%d", service.Spec.Ports[0].Port),
		"/api/v1/label/__name__/values",
		queryParams,
	)

	rawQuery, err := resp.DoRaw(context.TODO())

	if err != nil {
		return fmt.Sprintf("kube_hpa_%s", suffix)
	}

	rawQueryObj := &promRawValuesQuery{}

	json.Unmarshal(rawQuery, rawQueryObj)

	if rawQueryObj.Status == "success" && len(rawQueryObj.Data) == 1 {
		return fmt.Sprintf("kube_horizontal_pod_autoscaler_%s", suffix)
	}

	return fmt.Sprintf("kube_hpa_%s", suffix)
}
