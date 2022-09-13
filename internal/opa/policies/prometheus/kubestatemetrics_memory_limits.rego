package prometheus.kubestatemetrics_memory_limits

import future.keywords.if

# Policy expects input structure of form:
# values: {}

# This policy tests for the existence of memory limits as a hard constraint. We look
# for Helm values of the form:
# 
# kube-state-metrics:
#   resources:
#     limits:
#       cpu: 200m
#       memory: 256Mi
#     requests:
#       cpu: 10m
#       memory: 256Mi

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("Prometheus kube-state-metrics should have memory limits set", [])

allow if {
	input.values["kube-state-metrics"].resources.limits.memory
}

POLICY_MESSAGE := sprintf("Success: Prometheus kube-state-metrics has memory limits set", []) if allow

else := sprintf("Failed: Prometheus kube-state-metrics does not have memory limits set", []) {
	true
}
