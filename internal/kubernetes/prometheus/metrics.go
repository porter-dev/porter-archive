package prometheus

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/porter-dev/porter/internal/telemetry"

	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ListNGINXIngressesResponse []SimpleIngress

type GetPodMetricsRequest struct {
	QueryOpts
}

// GetPrometheusService returns the prometheus service name. The prometheus-community/prometheus chart @ v15.5.3 uses non-FQDN labels, unlike v22.6.2. This function checks for both labels.
func GetPrometheusService(clientset kubernetes.Interface) (*v1.Service, bool, error) {
	redundantServices, err := clientset.CoreV1().Services("monitoring").List(context.TODO(), metav1.ListOptions{
		LabelSelector: "app=prometheus,component=server,heritage=Helm",
	})
	if err != nil {
		return nil, false, err
	}

	upgradedServices, err := clientset.CoreV1().Services("monitoring").List(context.TODO(), metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/component=server,app.kubernetes.io/instance=prometheus,app.kubernetes.io/managed-by=Helm",
	})
	if err != nil {
		return nil, false, err
	}

	if len(redundantServices.Items) > 0 {
		return &redundantServices.Items[0], true, nil
	}
	if len(upgradedServices.Items) > 0 {
		return &upgradedServices.Items[0], true, nil
	}

	return nil, false, err
}

// getKubeStateMetricsService returns the prometheus service name
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
	// the name of the metric being queried for
	Metric    string   `schema:"metric"`
	ShouldSum bool     `schema:"shouldsum"`
	Kind      string   `schema:"kind"`
	PodList   []string `schema:"pods"`
	Name      string   `schema:"name"`
	Namespace string   `schema:"namespace"`
	// start time (in unix timestamp) for prometheus results
	StartRange uint `schema:"startrange"`
	// end time time (in unix timestamp) for prometheus results
	EndRange   uint    `schema:"endrange"`
	Resolution string  `schema:"resolution"`
	Percentile float64 `schema:"percentile"`
}

func QueryPrometheus(
	ctx context.Context,
	clientset kubernetes.Interface,
	service *v1.Service,
	opts *QueryOpts,
) ([]*promParsedSingletonQuery, error) {
	ctx, span := telemetry.NewSpan(ctx, "query-prometheus")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metric", Value: opts.Metric},
		telemetry.AttributeKV{Key: "should-sum", Value: opts.ShouldSum},
		telemetry.AttributeKV{Key: "kind", Value: opts.Kind},
		telemetry.AttributeKV{Key: "pod-list", Value: strings.Join(opts.PodList, ",")},
		telemetry.AttributeKV{Key: "name", Value: opts.Name},
		telemetry.AttributeKV{Key: "namespace", Value: opts.Namespace},
		telemetry.AttributeKV{Key: "start-range", Value: opts.StartRange},
		telemetry.AttributeKV{Key: "end-range", Value: opts.EndRange},
		telemetry.AttributeKV{Key: "range", Value: opts.EndRange - opts.StartRange},
		telemetry.AttributeKV{Key: "resolution", Value: opts.Resolution},
		telemetry.AttributeKV{Key: "percentile", Value: opts.Percentile},
	)

	if len(service.Spec.Ports) == 0 {
		return nil, telemetry.Error(ctx, span, nil, "prometheus service has no exposed ports to query")
	}

	selectionRegex, err := getSelectionRegex(opts.Kind, opts.Name)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "failed to get selection regex")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "selection-regex", Value: selectionRegex})

	var podSelector string

	if len(opts.PodList) > 0 {
		podSelector = fmt.Sprintf(`namespace="%s",pod=~"%s",container!="POD",container!=""`, opts.Namespace, strings.Join(opts.PodList, "|"))
	} else {
		podSelector = fmt.Sprintf(`namespace="%s",pod=~"%s",container!="POD",container!=""`, opts.Namespace, selectionRegex)
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pod-selector", Value: podSelector})

	query := ""

	if opts.Metric == "cpu" {
		query = fmt.Sprintf("rate(container_cpu_usage_seconds_total{%s}[5m])", podSelector)
	} else if opts.Metric == "memory" {
		query = fmt.Sprintf("container_memory_usage_bytes{%s}", podSelector)
	} else if opts.Metric == "network" {
		netPodSelector := fmt.Sprintf(`namespace="%s",pod=~"%s"`, opts.Namespace, selectionRegex)
		query = fmt.Sprintf("rate(container_network_receive_bytes_total{%s}[5m])", netPodSelector)
	} else if opts.Metric == "nginx:errors" {
		num := fmt.Sprintf(`(sum(rate(nginx_ingress_controller_requests{status=~"5.*",exported_namespace="%s",ingress=~"%s"}[5m]) OR sum(rate(nginx_ingress_controller_requests{status=~"5.*",namespace="%s",ingress=~"%s"}[5m])) OR on() vector(0))`, opts.Namespace, selectionRegex, opts.Namespace, selectionRegex)
		denom := fmt.Sprintf(`(sum(rate(nginx_ingress_controller_requests{exported_namespace="%s",ingress=~"%s"}[5m]) OR sum(rate(nginx_ingress_controller_requests{namespace="%s",ingress=~"%s"}[5m])) > 0)`, opts.Namespace, selectionRegex, opts.Namespace, selectionRegex)
		query = fmt.Sprintf(`%s / %s * 100 OR on() vector(0)`, num, denom)
	} else if opts.Metric == "nginx:latency" {
		num := fmt.Sprintf(`(sum(rate(nginx_ingress_controller_request_duration_seconds_sum{exported_namespace=~"%s",ingress=~"%s"}[5m]) OR sum(rate(nginx_ingress_controller_request_duration_seconds_sum{namespace=~"%s",ingress=~"%s"}[5m])) OR on() vector(0))`, opts.Namespace, selectionRegex, opts.Namespace, selectionRegex)
		denom := fmt.Sprintf(`(sum(rate(nginx_ingress_controller_request_duration_seconds_count{exported_namespace=~"%s",ingress=~"%s"}[5m])) OR sum(rate(nginx_ingress_controller_request_duration_seconds_count{namespace=~"%s",ingress=~"%s"}[5m])))`, opts.Namespace, selectionRegex, opts.Namespace, selectionRegex)
		query = fmt.Sprintf(`%s / %s OR on() vector(0)`, num, denom)
	} else if opts.Metric == "nginx:latency-histogram" {
		query = fmt.Sprintf(`histogram_quantile(%f, (sum(rate(nginx_ingress_controller_request_duration_seconds_bucket{status!="404",status!="500",exported_namespace=~"%s",ingress=~"%s"}[5m])) OR sum(rate(nginx_ingress_controller_request_duration_seconds_bucket{status!="404",status!="500",namespace=~"%s",ingress=~"%s"}[5m]))) by (le, ingress))`, opts.Percentile, opts.Namespace, selectionRegex, opts.Namespace, selectionRegex)
	} else if opts.Metric == "nginx:status" {
		query, err = getNginxStatusQuery(opts, selectionRegex)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "failed to get nginx status query")
		}
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
	} else if opts.Metric == "replicas" {
		query = fmt.Sprintf(`kube_deployment_status_replicas{deployment="%s"}`, opts.Name)
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "query", Value: query})

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

	rawQuery, err := resp.DoRaw(ctx)
	if err != nil {
		// in this case, it's very likely that prometheus doesn't contain any data for the given labels
		if strings.Contains(err.Error(), "rejected our request for an unknown reason") {
			return []*promParsedSingletonQuery{}, nil
		}

		return nil, telemetry.Error(ctx, span, err, "failed to get raw query")
	}

	parsedQuery, err := parseQuery(ctx, rawQuery, opts.Metric)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "failed to parse query")
	}

	return parsedQuery, nil
}

func getNginxStatusQuery(opts *QueryOpts, selectionRegex string) (string, error) {
	var queries []string

	// we recently changed the way labels are read into prometheus, which has removed the 'exported_' prepended to certain labels
	namespaceLabels := []string{"exported_namespace", "namespace"}
	for _, namespaceLabel := range namespaceLabels {
		queries = append(queries, fmt.Sprintf(`round(sum by (status_code, ingress)(label_replace(increase(nginx_ingress_controller_requests{%s=~"%s",ingress="%s",service="%s"}[2m]), "status_code", "${1}xx", "status", "(.)..")), 0.001)`, namespaceLabel, opts.Namespace, selectionRegex, opts.Name))
	}
	query := strings.Join(queries, " or ")
	return query, nil
}

type promRawQuery struct {
	Data struct {
		Result []struct {
			Metric struct {
				Pod        string `json:"pod,omitempty"`
				StatusCode string `json:"status_code,omitempty"`
			} `json:"metric,omitempty"`

			Values [][]interface{} `json:"values"`
		} `json:"result"`
	} `json:"data"`
}

type promParsedSingletonQueryResult struct {
	Date          interface{} `json:"date,omitempty"`
	CPU           interface{} `json:"cpu,omitempty"`
	Replicas      interface{} `json:"replicas,omitempty"`
	Memory        interface{} `json:"memory,omitempty"`
	Bytes         interface{} `json:"bytes,omitempty"`
	ErrorPct      interface{} `json:"error_pct,omitempty"`
	Latency       interface{} `json:"latency,omitempty"`
	StatusCode0xx interface{} `json:"0xx,omitempty"`
	StatusCode1xx interface{} `json:"1xx,omitempty"`
	StatusCode2xx interface{} `json:"2xx,omitempty"`
	StatusCode3xx interface{} `json:"3xx,omitempty"`
	StatusCode4xx interface{} `json:"4xx,omitempty"`
	StatusCode5xx interface{} `json:"5xx,omitempty"`
}

type promParsedSingletonQuery struct {
	Pod     string                           `json:"pod,omitempty"`
	Results []promParsedSingletonQueryResult `json:"results"`
}

func parseQuery(ctx context.Context, rawQuery []byte, metric string) ([]*promParsedSingletonQuery, error) {
	ctx, span := telemetry.NewSpan(ctx, "parse-query")
	defer span.End()

	if metric == "nginx:status" {
		return parseNginxStatusQuery(ctx, rawQuery)
	}

	rawQueryObj := &promRawQuery{}

	err := json.Unmarshal(rawQuery, rawQueryObj)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "failed to unmarshal raw query")
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
			} else if metric == "replicas" {
				singletonResult.Replicas = values[1]
			}

			singletonResults = append(singletonResults, *singletonResult)
		}

		singleton.Results = singletonResults

		res = append(res, singleton)
	}

	return res, nil
}

func parseNginxStatusQuery(ctx context.Context, rawQuery []byte) ([]*promParsedSingletonQuery, error) {
	ctx, span := telemetry.NewSpan(ctx, "parse-nginx-status-query")
	defer span.End()

	rawQueryObj := &promRawQuery{}

	err := json.Unmarshal(rawQuery, rawQueryObj)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "failed to unmarshal raw query")
	}

	singletonResultsByDate := make(map[string]*promParsedSingletonQueryResult, 0)
	keys := make([]string, 0)
	for _, result := range rawQueryObj.Data.Result {
		for _, values := range result.Values {
			date := values[0]
			dateKey := fmt.Sprintf("%v", date)

			if _, ok := singletonResultsByDate[dateKey]; !ok {
				keys = append(keys, dateKey)
				singletonResultsByDate[dateKey] = &promParsedSingletonQueryResult{
					Date: date,
				}
			}

			switch result.Metric.StatusCode {
			case "0xx":
				singletonResultsByDate[dateKey].StatusCode0xx = values[1]
			case "1xx":
				singletonResultsByDate[dateKey].StatusCode1xx = values[1]
			case "2xx":
				singletonResultsByDate[dateKey].StatusCode2xx = values[1]
			case "3xx":
				singletonResultsByDate[dateKey].StatusCode3xx = values[1]
			case "4xx":
				singletonResultsByDate[dateKey].StatusCode4xx = values[1]
			case "5xx":
				singletonResultsByDate[dateKey].StatusCode5xx = values[1]
			default:
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "status-code", Value: result.Metric.StatusCode})
				return nil, telemetry.Error(ctx, span, nil, "unknown status code")
			}
		}
	}

	sort.Strings(keys)

	singletonResults := make([]promParsedSingletonQueryResult, 0)
	for _, k := range keys {
		singletonResults = append(singletonResults, *singletonResultsByDate[k])
	}

	singleton := &promParsedSingletonQuery{
		Results: singletonResults,
	}

	res := make([]*promParsedSingletonQuery, 0)
	res = append(res, singleton)

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
		`avg by (%s) (label_replace(%s{%s},"%s", "%s", "", ""))`,
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
		`avg by (%s) (label_replace(%s{%s},"%s", "%s", "", ""))`,
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
		`avg by (%s) (label_replace(%s{%s},"%s", "%s", "", ""))`,
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
		`avg by (%s) (label_replace(%s{%s},"%s", "%s", "", ""))`,
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
