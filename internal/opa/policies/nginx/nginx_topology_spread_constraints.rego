package nginx.topology_spread_constraints

import future.keywords.if

# Policy expects input structure of form:
# values: {}

# This policy tests for the existence of topologySpreadConstraints as a soft constraint. We look
# for Helm values of the form:
# 
# controller:
#   topologySpreadConstraints:
#     - labelSelector:
#         matchLabels:
#           app.kubernetes.io/component: controller
#           app.kubernetes.io/instance: nginx-ingress
#           app.kubernetes.io/name: ingress-nginx
#       maxSkew: 1
#       topologyKey: kubernetes.io/hostname
#       whenUnsatisfiable: DoNotSchedule
#     - labelSelector:
#         matchLabels:
#           app.kubernetes.io/component: controller
#           app.kubernetes.io/instance: nginx-ingress
#           app.kubernetes.io/name: ingress-nginx
#       maxSkew: 1
#       topologyKey: topology.kubernetes.io/zone
#       whenUnsatisfiable: ScheduleAnyway

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("NGINX ingress controller should have topology spread constraints", [])

allow if {
	count(input.values.controller.topologySpreadConstraints) >= 1
}

POLICY_MESSAGE := sprintf("Success: NGINX ingress controller has topology spread constraints", []) if allow

else := sprintf("Failed: NGINX ingress controller does not have topology spread constraints set", []) {
	true
}
