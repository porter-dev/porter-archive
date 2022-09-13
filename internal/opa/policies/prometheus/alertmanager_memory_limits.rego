package prometheus.alertmanager_memory_limits

import future.keywords.if

# Policy expects input structure of form:
# values: {}

# This policy tests for the existence of memory limits as a hard constraint. We look
# for Helm values of the form:
# 
# alertmanager:
#   resources:
#     limits:
#       cpu: 200m
#       memory: 256Mi
#     requests:
#       cpu: 10m
#       memory: 256Mi

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("Prometheus alert-manager should have memory limits set", [])

allow if {
	input.values.alertmanager.resources.limits.memory
}

POLICY_MESSAGE := sprintf("Success: Prometheus alert-manager has memory limits set", []) if allow

else := sprintf("Failed: Prometheus alert-manager does not have memory limits set", []) {
	true
}
