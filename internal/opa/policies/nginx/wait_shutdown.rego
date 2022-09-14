package nginx.wait_shutdown

import future.keywords

# Policy expects input structure of form:
# values: {}

# This policy tests for the modification of the wait-shutdown script as a soft constraint. We look
# for Helm values of the form:
# 
# controller:
#   lifecycle:
#     preStop:
#       exec:
#         command:
#           - sh
#           - '-c'
#           - sleep 120 && /wait-shutdown

POLICY_ID := "nginx_wait_shutdown"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("NGINX ingress controller should have a modified wait-shutdown script", [])

POLICY_SUCCESS_MESSAGE := sprintf("Success: NGINX ingress controller has a properly modified wait-shutdown script set", [])

allow if {
	input.values.controller.lifecycle.preStop.exec.command
	count(input.values.controller.lifecycle.preStop.exec.command) != 1
}

FAILURE_MESSAGE contains msg if {
	not allow
	msg := sprintf("Failed: NGINX ingress controller does not have a properly modified wait-shutdown script", [])
}
