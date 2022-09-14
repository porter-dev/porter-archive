package cert_manager.webhook_memory_limits

import future.keywords

# This policy tests for the existence of memory limits as a hard constraint. We look
# for Helm values of the form:
# 
# webhook:
#   resources:
#     limits:
#       memory: 512Mi
#     requests:
#       cpu: 50m
#       memory: 512Mi

POLICY_ID := "webhook_memory_limits"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("Cert-manager webhook should have memory limits set", [])

POLICY_SUCCESS_MESSAGE := sprintf("Success: Cert-manager webhook has memory limits set", [])

allow if {
	input.values.webhook.resources.limits.memory
}

FAILURE_MESSAGE contains msg if {
	not allow
	msg := "Failed: Cert-manager webhook does not have memory limits set"
}
