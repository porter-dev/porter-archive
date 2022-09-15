package prometheus.server_memory_limits

import future.keywords

# Policy expects input structure of form:
# values: {}

# This policy tests for the existence of memory limits as a hard constraint. We look
# for Helm values of the form:
# 
# server:
#   resources:
#     limits:
#       cpu: 500m
#       memory: 400Mi
#     requests:
#       cpu: 100m
#       memory: 400Mi

POLICY_ID := "server_memory_limits"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("Prometheus server should have memory limits set", [])

POLICY_SUCCESS_MESSAGE := sprintf("Success: Prometheus server has memory limits set", [])

allow if {
	input.values.server.resources.limits.memory
}

FAILURE_MESSAGE contains msg if {
	not allow
	msg := "Failed: Prometheus server does not have memory limits set"
}
