package notifications

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/templater/utils"
	"gopkg.in/yaml.v2"
)

type PrometheusRule struct {
	Record      string            `yaml:"record,omitempty"`
	Alert       string            `yaml:"alert,omitempty"`
	Expr        string            `yaml:"expr"`
	For         string            `yaml:"for,omitempty"`
	Labels      map[string]string `yaml:"labels,omitempty"`
	Annotations map[string]string `yaml:"annotations,omitempty"`
}

type PrometheusRuleGroup struct {
	Name     string            `yaml:"name"`
	Interval string            `yaml:"interval,omitempty"`
	Rules    []*PrometheusRule `yaml:"rules"`
}

type PrometheusRuleGroups struct {
	Groups []*PrometheusRuleGroup `yaml:"groups"`
}

type prometheusBackend struct {
	config *config.Config
	authz.KubernetesAgentGetter
	actions         map[string]*types.NotificationAction
	prometheusRules map[string]*PrometheusRule
}

func newPrometheusBackend(config *config.Config) NotificationsBackend {
	backend := &prometheusBackend{
		config:                config,
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
		actions:               make(map[string]*types.NotificationAction),
		prometheusRules:       make(map[string]*PrometheusRule),
	}

	k8sNodeReadyAction, rule := newK8sNodeReadyAction()
	backend.actions[k8sNodeReadyAction.ID] = k8sNodeReadyAction
	backend.prometheusRules[k8sNodeReadyAction.ID] = rule

	k8sJobFailedAction, rule := newK8sJobFailedAction()
	backend.actions[k8sJobFailedAction.ID] = k8sJobFailedAction
	backend.prometheusRules[k8sJobFailedAction.ID] = rule

	k8sMemoryPressureAction, rule := newK8sMemoryPressureAction()
	backend.actions[k8sMemoryPressureAction.ID] = k8sMemoryPressureAction
	backend.prometheusRules[k8sMemoryPressureAction.ID] = rule

	k8sPodCPUThrottlingAction, rule := newK8sPodCPUThrottlingAction()
	backend.actions[k8sPodCPUThrottlingAction.ID] = k8sPodCPUThrottlingAction
	backend.prometheusRules[k8sPodCPUThrottlingAction.ID] = rule

	k8sContainerOomKillerAction, rule := newK8sContainerOomKillerAction()
	backend.actions[k8sContainerOomKillerAction.ID] = k8sContainerOomKillerAction
	backend.prometheusRules[k8sContainerOomKillerAction.ID] = rule

	k8sPodCrashLoopingAction, rule := newK8sPodCrashLoopingAction()
	backend.actions[k8sPodCrashLoopingAction.ID] = k8sPodCrashLoopingAction
	backend.prometheusRules[k8sPodCrashLoopingAction.ID] = rule

	k8sCronjobTooLongAction, rule := newK8sCronjobTooLongAction()
	backend.actions[k8sCronjobTooLongAction.ID] = k8sCronjobTooLongAction
	backend.prometheusRules[k8sCronjobTooLongAction.ID] = rule

	return backend
}

func (b *prometheusBackend) Name() string {
	return "prometheus"
}

func (b *prometheusBackend) Actions() map[string]*types.NotificationAction {
	return b.actions
}

func (a *prometheusBackend) Apply(r *http.Request, actions []string) error {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	helmAgent, err := a.GetHelmAgent(r, cluster, "monitoring")

	if err != nil {
		return err
	}

	registries, err := a.config.Repo.Registry().ListRegistriesByProjectID(cluster.ProjectID)

	if err != nil {
		return err
	}

	values, err := helmAgent.GetValues("prometheus", false)

	if err != nil {
		return err
	}

	ruleGroup := &PrometheusRuleGroup{
		Name: "Default Alerts",
	}

	for _, actionID := range actions {
		if _, ok := a.actions[actionID]; !ok {
			continue
		}

		ruleGroup.Rules = append(ruleGroup.Rules, a.prometheusRules[actionID])
	}

	ruleGroups := &PrometheusRuleGroups{
		Groups: []*PrometheusRuleGroup{ruleGroup},
	}

	bytes, err := yaml.Marshal(map[string]interface{}{
		"serverFiles": map[string]interface{}{
			"alerting_rules.yml": ruleGroups,
		},
	})

	if err != nil {
		return err
	}

	alertValues := make(map[string]interface{})

	err = yaml.Unmarshal(bytes, alertValues)

	if err != nil {
		return err
	}

	values = utils.CoalesceValues(values, alertValues)

	bytes, err = yaml.Marshal(values)

	if err != nil {
		return err
	}

	_, err = helmAgent.UpgradeRelease(&helm.UpgradeReleaseConfig{
		Name:       "prometheus",
		Cluster:    cluster,
		Repo:       a.config.Repo,
		Registries: registries,
	}, string(bytes), a.config.DOConf)

	if err != nil {
		return err
	}

	return nil
}

// Actions

func newK8sNodeReadyAction() (*types.NotificationAction, *PrometheusRule) {
	action := &types.NotificationAction{
		ID:          "KubernetesNodeReady",
		Description: "Alert when a cluster node is unavailable",
		Type:        "toggle",
		Value:       "false",
	}

	rule := &PrometheusRule{
		Alert: action.ID,
		Expr:  "kube_node_status_condition{condition=\"Ready\",status=\"true\"} == 0",
		For:   "10m",
		Labels: map[string]string{
			"severity": "critical",
		},
		Annotations: map[string]string{
			"summary":     "Kubernetes Node ready (instance {{ $labels.instance }})",
			"description": "Node {{ $labels.node }} has been unready for a long time\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}",
		},
	}

	return action, rule
}

func newK8sJobFailedAction() (*types.NotificationAction, *PrometheusRule) {
	action := &types.NotificationAction{
		ID:          "KubernetesJobFailed",
		Description: "Alert when a job fails",
		Type:        "toggle",
		Value:       "false",
	}

	rule := &PrometheusRule{
		Alert: action.ID,
		Expr:  "kube_job_status_failed > 0",
		For:   "1m",
		Labels: map[string]string{
			"severity": "warning",
		},
		Annotations: map[string]string{
			"summary":     "Kubernetes Job failed (instance {{ $labels.instance }})",
			"description": "Job {{$labels.namespace}}/{{$labels.exported_job}} failed to complete\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}",
		},
	}

	return action, rule
}

func newK8sMemoryPressureAction() (*types.NotificationAction, *PrometheusRule) {
	action := &types.NotificationAction{
		ID:          "KubernetesMemoryPressure",
		Description: "Alert in case of memory pressure",
		Type:        "toggle",
		Value:       "false",
	}

	rule := &PrometheusRule{
		Alert: action.ID,
		Expr:  "kube_node_status_condition{condition=\"MemoryPressure\",status=\"true\"} == 1",
		For:   "2m",
		Labels: map[string]string{
			"severity": "critical",
		},
		Annotations: map[string]string{
			"summary":     "Kubernetes memory pressure (instance {{ $labels.instance }})",
			"description": "{{ $labels.node }} has MemoryPressure condition\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}",
		},
	}

	return action, rule
}

func newK8sPodCPUThrottlingAction() (*types.NotificationAction, *PrometheusRule) {
	action := &types.NotificationAction{
		ID:          "PodCPUThrottling",
		Description: "Alert in case of CPU throttling",
		Type:        "toggle",
		Value:       "false",
	}

	rule := &PrometheusRule{
		Alert: action.ID,
		Expr:  "100 * sum by(container_name, pod_name, namespace) (increase(container_cpu_cfs_throttled_periods_total{container_name!=\"\"}[5m])) / sum by(container_name, pod_name, namespace) (increase(container_cpu_cfs_periods_total[5m])) > 25",
		For:   "5m",
		Labels: map[string]string{
			"severity": "warning",
		},
		Annotations: map[string]string{
			"summary":     "Kubernetes Pod CPU throttled (instance {{ $labels.instance }})",
			"description": "{{ $labels.pod }}'s CPU is throttled\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}",
		},
	}

	return action, rule
}

func newK8sContainerOomKillerAction() (*types.NotificationAction, *PrometheusRule) {
	action := &types.NotificationAction{
		ID:          "KubernetesContainerOomKiller",
		Description: "Alert in case of an out-of-memory error in a Pod",
		Type:        "toggle",
		Value:       "false",
	}

	rule := &PrometheusRule{
		Alert: action.ID,
		Expr:  "(kube_pod_container_status_restarts_total - kube_pod_container_status_restarts_total offset 10m >= 1) and ignoring (reason) min_over_time(kube_pod_container_status_last_terminated_reason{reason=\"OOMKilled\"}[10m]) == 1",
		For:   "0m",
		Labels: map[string]string{
			"severity": "warning",
		},
		Annotations: map[string]string{
			"summary":     "Kubernetes container OOM killer (instance {{ $labels.instance }})",
			"description": "Container {{ $labels.container }} in pod {{ $labels.namespace }}/{{ $labels.pod }} has been OOMKilled {{ $value }} times in the last 10 minutes.\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}",
		},
	}

	return action, rule
}

func newK8sPodCrashLoopingAction() (*types.NotificationAction, *PrometheusRule) {
	action := &types.NotificationAction{
		ID:          "KubernetesPodCrashLooping",
		Description: "Alert in case of a Pod crash loop backing off",
		Type:        "toggle",
		Value:       "false",
	}

	rule := &PrometheusRule{
		Alert: action.ID,
		Expr:  "increase(kube_pod_container_status_restarts_total[1m]) > 3",
		For:   "2m",
		Labels: map[string]string{
			"severity": "warning",
		},
		Annotations: map[string]string{
			"summary":     "Kubernetes pod crash looping (instance {{ $labels.instance }})",
			"description": "Pod {{ $labels.pod }} is crash looping\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}",
		},
	}

	return action, rule
}

func newK8sCronjobTooLongAction() (*types.NotificationAction, *PrometheusRule) {
	action := &types.NotificationAction{
		ID:          "KubernetesCronjobTooLong",
		Description: "Alert in case of a stuck cron job",
		Type:        "toggle",
		Value:       "false",
	}

	rule := &PrometheusRule{
		Alert: action.ID,
		Expr:  "time() - kube_cronjob_next_schedule_time > 3600",
		For:   "0m",
		Labels: map[string]string{
			"severity": "warning",
		},
		Annotations: map[string]string{
			"summary":     "Kubernetes CronJob too long (instance {{ $labels.instance }})",
			"description": "CronJob {{ $labels.namespace }}/{{ $labels.cronjob }} is taking more than 1h to complete.\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}",
		},
	}

	return action, rule
}
