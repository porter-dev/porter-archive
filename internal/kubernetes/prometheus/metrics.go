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

// returns the prometheus service name
func getKubeStateMetricsService(clientset kubernetes.Interface) (*v1.Service, bool, error) {
	services, err := clientset.CoreV1().Services("").List(context.TODO(), metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/name=kube-state-metrics",
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
	res := make([]SimpleIngress, 0)
	foundMap := make(map[string]bool)

	v1beta1IngressList, v1beta1Err := clientset.NetworkingV1beta1().Ingresses("").List(context.TODO(), metav1.ListOptions{})
	v1IngressList, v1Err := clientset.NetworkingV1().Ingresses("").List(context.TODO(), metav1.ListOptions{})

	if v1beta1Err != nil && v1Err != nil {
		return nil, fmt.Errorf("List ingresses error: %s, %s", v1beta1Err.Error(), v1Err.Error())
	}

	if v1beta1Err == nil && len(v1beta1IngressList.Items) > 0 {
		for _, ingress := range v1beta1IngressList.Items {
			ingressAnn, found := ingress.ObjectMeta.Annotations["kubernetes.io/ingress.class"]
			uid := fmt.Sprintf("%s/%s", ingress.ObjectMeta.Namespace, ingress.ObjectMeta.Name)

			if _, exists := foundMap[uid]; !exists && ((found && ingressAnn == "nginx") || *ingress.Spec.IngressClassName == "nginx") {
				res = append(res, SimpleIngress{
					Name:      ingress.ObjectMeta.Name,
					Namespace: ingress.ObjectMeta.Namespace,
				})

				foundMap[uid] = true
			}
		}
	}

	if v1Err == nil && len(v1IngressList.Items) > 0 {
		for _, ingress := range v1IngressList.Items {
			ingressAnn, found := ingress.ObjectMeta.Annotations["kubernetes.io/ingress.class"]
			uid := fmt.Sprintf("%s/%s", ingress.ObjectMeta.Namespace, ingress.ObjectMeta.Name)

			if _, exists := foundMap[uid]; !exists && ((found && ingressAnn == "nginx") || *ingress.Spec.IngressClassName == "nginx") {
				res = append(res, SimpleIngress{
					Name:      ingress.ObjectMeta.Name,
					Namespace: ingress.ObjectMeta.Namespace,
				})

				foundMap[uid] = true
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
	Percentile float64  `schema:"percentile"`
}

func QueryPrometheus(
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *QueryOpts,
) ([]*promParsedSingletonQuery, error) {
	if len(service.Spec.Ports) == 0 {
		return nil, fmt.Errorf("prometheus service has no exposed ports to query")
	}

	selectionRegex, err := getSelectionRegex(opts.Kind, opts.Name)

	if err != nil {
		return nil, err
	}

	var podSelector string

	if len(opts.PodList) > 0 {
		podSelector = fmt.Sprintf(`namespace="%s",pod=~"%s",container!="POD",container!=""`, opts.Namespace, strings.Join(opts.PodList, "|"))
	} else {
		podSelector = fmt.Sprintf(`namespace="%s",pod=~"%s",container!="POD",container!=""`, opts.Namespace, selectionRegex)
	}

	query := ""

	if opts.Metric == "cpu" {
		query = fmt.Sprintf("rate(container_cpu_usage_seconds_total{%s}[5m])", podSelector)
	} else if opts.Metric == "memory" {
		query = fmt.Sprintf("container_memory_usage_bytes{%s}", podSelector)
	} else if opts.Metric == "network" {
		netPodSelector := fmt.Sprintf(`namespace="%s",pod=~"%s",container="POD"`, opts.Namespace, selectionRegex)
		query = fmt.Sprintf("rate(container_network_receive_bytes_total{%s}[5m])", netPodSelector)
	} else if opts.Metric == "nginx:errors" {
		num := fmt.Sprintf(`sum(rate(nginx_ingress_controller_requests{status=~"5.*",exported_namespace="%s",ingress=~"%s"}[5m]) OR on() vector(0))`, opts.Namespace, selectionRegex)
		denom := fmt.Sprintf(`sum(rate(nginx_ingress_controller_requests{exported_namespace="%s",ingress=~"%s"}[5m]) > 0)`, opts.Namespace, selectionRegex)
		query = fmt.Sprintf(`%s / %s * 100 OR on() vector(0)`, num, denom)
	} else if opts.Metric == "nginx:latency" {
		num := fmt.Sprintf(`sum(rate(nginx_ingress_controller_request_duration_seconds_sum{exported_namespace=~"%s",ingress=~"%s"}[5m]) OR on() vector(0))`, opts.Namespace, selectionRegex)
		denom := fmt.Sprintf(`sum(rate(nginx_ingress_controller_request_duration_seconds_count{exported_namespace=~"%s",ingress=~"%s"}[5m]))`, opts.Namespace, selectionRegex)
		query = fmt.Sprintf(`%s / %s OR on() vector(0)`, num, denom)
	} else if opts.Metric == "nginx:latency-histogram" {
		query = fmt.Sprintf(`histogram_quantile(%f, sum(rate(nginx_ingress_controller_request_duration_seconds_bucket{status!="404",status!="500",exported_namespace=~"%s",ingress=~"%s"}[5m])) by (le, ingress))`, opts.Percentile, opts.Namespace, selectionRegex)
	} else if opts.Metric == "cpu_hpa_threshold" {
		// get the name of the kube hpa metric
		metricName, hpaMetricName := getKubeHPAMetricName(clientset, service, opts, "spec_target_metric")
		cpuMetricName := getKubeCPUMetricName(clientset, service, opts)
		ksmSvc, found, _ := getKubeStateMetricsService(clientset)
		appLabel := ""

		if found {
			appLabel = ksmSvc.ObjectMeta.Labels["app.kubernetes.io/instance"]
		}

		query = createHPAAbsoluteCPUThresholdQuery(cpuMetricName, metricName, selectionRegex, opts.Name, opts.Namespace, appLabel, hpaMetricName)
	} else if opts.Metric == "memory_hpa_threshold" {
		metricName, hpaMetricName := getKubeHPAMetricName(clientset, service, opts, "spec_target_metric")
		memMetricName := getKubeMemoryMetricName(clientset, service, opts)
		ksmSvc, found, _ := getKubeStateMetricsService(clientset)
		appLabel := ""

		if found {
			appLabel = ksmSvc.ObjectMeta.Labels["app.kubernetes.io/instance"]
		}

		query = createHPAAbsoluteMemoryThresholdQuery(memMetricName, metricName, selectionRegex, opts.Name, opts.Namespace, appLabel, hpaMetricName)
	} else if opts.Metric == "hpa_replicas" {
		metricName, hpaMetricName := getKubeHPAMetricName(clientset, service, opts, "status_current_replicas")
		ksmSvc, found, _ := getKubeStateMetricsService(clientset)
		appLabel := ""

		if found {
			appLabel = ksmSvc.ObjectMeta.Labels["app.kubernetes.io/instance"]
		}

		query = createHPACurrentReplicasQuery(metricName, opts.Name, opts.Namespace, appLabel, hpaMetricName)
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
		// in this case, it's very likely that prometheus doesn't contain any data for the given labels
		if strings.Contains(err.Error(), "rejected our request for an unknown reason") {
			return []*promParsedSingletonQuery{}, nil
		}

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
	Latency  interface{} `json:"latency,omitempty"`
}

type promParsedSingletonQuery struct {
	Pod     string                           `json:"pod,omitempty"`
	Results []promParsedSingletonQueryResult `json:"results"`
}

func parseQuery(rawQuery []byte, metric string) ([]*promParsedSingletonQuery, error) {
	rawQueryObj := &promRawQuery{}

	err := json.Unmarshal(rawQuery, rawQueryObj)

	if err != nil {
		return nil, err
	}

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
			} else if metric == "nginx:latency" || metric == "nginx:latency-histogram" {
				singletonResult.Latency = values[1]
			}

			singletonResults = append(singletonResults, *singletonResult)
		}

		singleton.Results = singletonResults

		res = append(res, singleton)
	}

	return res, nil
}

func getSelectionRegex(kind, name string) (string, error) {
	var suffix string

	switch strings.ToLower(kind) {
	case "deployment":
		suffix = "[a-z0-9]+(-[a-z0-9]+)*"
	case "statefulset":
		suffix = "[0-9]+"
	case "job":
		suffix = "[a-z0-9]+"
	case "cronjob":
		suffix = "[a-z0-9]+-[a-z0-9]+"
	case "ingress":
		return name, nil
	case "daemonset":
		suffix = "[a-z0-9]+"
	default:
		return "", fmt.Errorf("not a supported controller to query for metrics")
	}

	return fmt.Sprintf("%s-%s", name, suffix), nil
}

func createHPAAbsoluteCPUThresholdQuery(cpuMetricName, metricName, podSelectionRegex, hpaName, namespace, appLabel, hpaMetricName string) string {
	kubeMetricsPodSelectorOne := getKubeMetricsPodSelector(podSelectionRegex, namespace, "namespace")
	kubeMetricsPodSelectorTwo := getKubeMetricsPodSelector(podSelectionRegex, namespace, "exported_namespace")

	kubeMetricsHPASelectorOne := fmt.Sprintf(
		`%s="%s",namespace="%s",metric_name="cpu",metric_target_type="utilization"`,
		hpaMetricName,
		hpaName,
		namespace,
	)

	kubeMetricsHPASelectorTwo := fmt.Sprintf(
		`%s="%s",exported_namespace="%s",metric_name="cpu",metric_target_type="utilization"`,
		hpaMetricName,
		hpaName,
		namespace,
	)

	if cpuMetricName == "kube_pod_container_resource_requests" {
		kubeMetricsPodSelectorOne += `,resource="cpu",unit="core"`
		kubeMetricsPodSelectorTwo += `,resource="cpu",unit="core"`
	}

	// the kube-state-metrics queries are less prone to error if the field app_kubernetes_io_instance is matched
	// as well
	if appLabel != "" {
		kubeMetricsPodSelectorOne += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
		kubeMetricsPodSelectorTwo += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
		kubeMetricsHPASelectorOne += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
		kubeMetricsHPASelectorTwo += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
	}

	requestCPUOne := fmt.Sprintf(
		`sum by (%s) (label_replace(%s{%s},"%s", "%s", "", ""))`,
		hpaMetricName,
		cpuMetricName,
		kubeMetricsPodSelectorOne,
		hpaMetricName,
		hpaName,
	)

	targetCPUUtilThresholdOne := fmt.Sprintf(
		`%s{%s} / 100`,
		metricName,
		kubeMetricsHPASelectorOne,
	)

	requestCPUTwo := fmt.Sprintf(
		`sum by (%s) (label_replace(%s{%s},"%s", "%s", "", ""))`,
		hpaMetricName,
		cpuMetricName,
		kubeMetricsPodSelectorTwo,
		hpaMetricName,
		hpaName,
	)

	targetCPUUtilThresholdTwo := fmt.Sprintf(
		`%s{%s} / 100`,
		metricName,
		kubeMetricsHPASelectorTwo,
	)

	return fmt.Sprintf(
		`(%s * on(%s) %s) or (%s * on(%s) %s)`,
		requestCPUOne, hpaMetricName, targetCPUUtilThresholdOne,
		requestCPUTwo, hpaMetricName, targetCPUUtilThresholdTwo,
	)
}

func createHPAAbsoluteMemoryThresholdQuery(memMetricName, metricName, podSelectionRegex, hpaName, namespace, appLabel, hpaMetricName string) string {
	kubeMetricsPodSelectorOne := getKubeMetricsPodSelector(podSelectionRegex, namespace, "namespace")
	kubeMetricsPodSelectorTwo := getKubeMetricsPodSelector(podSelectionRegex, namespace, "exported_namespace")

	kubeMetricsHPASelectorOne := fmt.Sprintf(
		`%s="%s",namespace="%s",metric_name="memory",metric_target_type="utilization"`,
		hpaMetricName,
		hpaName,
		namespace,
	)

	kubeMetricsHPASelectorTwo := fmt.Sprintf(
		`%s="%s",exported_namespace="%s",metric_name="memory",metric_target_type="utilization"`,
		hpaMetricName,
		hpaName,
		namespace,
	)

	if memMetricName == "kube_pod_container_resource_requests" {
		kubeMetricsPodSelectorOne += `,resource="memory",unit="byte"`
		kubeMetricsPodSelectorTwo += `,resource="memory",unit="byte"`
	}

	// the kube-state-metrics queries are less prone to error if the field app_kubernetes_io_instance is matched
	// as well
	if appLabel != "" {
		kubeMetricsPodSelectorOne += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
		kubeMetricsPodSelectorTwo += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
		kubeMetricsHPASelectorOne += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
		kubeMetricsHPASelectorTwo += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
	}

	requestMemOne := fmt.Sprintf(
		`sum by (%s) (label_replace(%s{%s},"%s", "%s", "", ""))`,
		hpaMetricName,
		memMetricName,
		kubeMetricsPodSelectorOne,
		hpaMetricName,
		hpaName,
	)

	targetMemUtilThresholdOne := fmt.Sprintf(
		`%s{%s} / 100`,
		metricName,
		kubeMetricsHPASelectorOne,
	)

	requestMemTwo := fmt.Sprintf(
		`sum by (%s) (label_replace(%s{%s},"%s", "%s", "", ""))`,
		hpaMetricName,
		memMetricName,
		kubeMetricsPodSelectorTwo,
		hpaMetricName,
		hpaName,
	)

	targetMemUtilThresholdTwo := fmt.Sprintf(
		`%s{%s} / 100`,
		metricName,
		kubeMetricsHPASelectorTwo,
	)

	return fmt.Sprintf(
		`(%s * on(%s) %s) or (%s * on(%s) %s)`,
		requestMemOne, hpaMetricName, targetMemUtilThresholdOne,
		requestMemTwo, hpaMetricName, targetMemUtilThresholdTwo,
	)
}

func getKubeMetricsPodSelector(podSelectionRegex, namespace, namespaceLabel string) string {
	return fmt.Sprintf(
		`pod=~"%s",%s="%s",container!="POD",container!=""`,
		podSelectionRegex,
		namespaceLabel,
		namespace,
	)
}

func createHPACurrentReplicasQuery(metricName, hpaName, namespace, appLabel, hpaMetricName string) string {
	kubeMetricsHPASelectorOne := fmt.Sprintf(
		`%s="%s",namespace="%s"`,
		hpaMetricName,
		hpaName,
		namespace,
	)

	kubeMetricsHPASelectorTwo := fmt.Sprintf(
		`%s="%s",exported_namespace="%s"`,
		hpaMetricName,
		hpaName,
		namespace,
	)

	// the kube-state-metrics queries are less prone to error if the field app_kubernetes_io_instance is matched
	// as well
	if appLabel != "" {
		kubeMetricsHPASelectorOne += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
		kubeMetricsHPASelectorTwo += fmt.Sprintf(`,app_kubernetes_io_instance="%s"`, appLabel)
	}

	return fmt.Sprintf(
		`(%s{%s}) or (%s{%s})`,
		metricName,
		kubeMetricsHPASelectorOne,
		metricName,
		kubeMetricsHPASelectorTwo,
	)
}

type promRawValuesQuery struct {
	Status string   `json:"status"`
	Data   []string `json:"data"`
}

// getKubeHPAMetricName performs a "best guess" for the name of the kube HPA metric,
// which was renamed to kube_horizontalpodautoscaler... in later versions of kube-state-metrics.
// we query Prometheus for a list of metric names to see if any match the new query
// value, otherwise we return the deprecated name.
func getKubeHPAMetricName(
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *QueryOpts,
	suffix string,
) (string, string) {
	queryParams := map[string]string{
		"match[]": fmt.Sprintf("kube_horizontalpodautoscaler_%s", suffix),
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
		return fmt.Sprintf("kube_hpa_%s", suffix), "hpa"
	}

	rawQueryObj := &promRawValuesQuery{}

	json.Unmarshal(rawQuery, rawQueryObj)

	if rawQueryObj.Status == "success" && len(rawQueryObj.Data) == 1 {
		return fmt.Sprintf("kube_horizontalpodautoscaler_%s", suffix), "horizontalpodautoscaler"
	}

	return fmt.Sprintf("kube_hpa_%s", suffix), "hpa"
}

func getKubeCPUMetricName(
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *QueryOpts,
) string {
	queryParams := map[string]string{
		"match[]": "kube_pod_container_resource_requests",
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
		return "kube_pod_container_resource_requests_cpu_cores"
	}

	rawQueryObj := &promRawValuesQuery{}

	json.Unmarshal(rawQuery, rawQueryObj)

	if rawQueryObj.Status == "success" && len(rawQueryObj.Data) == 1 {
		return "kube_pod_container_resource_requests"
	}

	return "kube_pod_container_resource_requests_cpu_cores"
}

func getKubeMemoryMetricName(
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *QueryOpts,
) string {
	queryParams := map[string]string{
		"match[]": "kube_pod_container_resource_requests",
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
		return "kube_pod_container_resource_requests_memory_bytes"
	}

	rawQueryObj := &promRawValuesQuery{}

	json.Unmarshal(rawQuery, rawQueryObj)

	if rawQueryObj.Status == "success" && len(rawQueryObj.Data) == 1 {
		return "kube_pod_container_resource_requests"
	}

	return "kube_pod_container_resource_requests_memory_bytes"
}
