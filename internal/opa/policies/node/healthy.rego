package node.healthy

import future.keywords

POLICY_ID := sprintf("healthy_%s", [input.metadata.name])

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "critical"

POLICY_TITLE := sprintf("The node %s should be healthy", [input.metadata.name])

POLICY_SUCCESS_MESSAGE := sprintf("Success: this node is healthy or is younger than 10 minutes", [])

# check if one of the node's conditions states that the kubelet is ready
allow if {
	some condition in input.status.conditions
	condition.reason == "KubeletReady"
	condition.status = "True"
}

# if the node was started in the last 10 minutes, we do not track it - it may 
# be unhealthy while initializing the CNI
allow if {
	rfc3339_is_younger_than_10_minutes(input.metadata.creationTimestamp)
}

FAILURE_MESSAGE contains msg if {
	not allow
	msg := sprintf("Failed: the node %s is not healthy", [input.metadata.name])
}

rfc3339_is_younger_than_10_minutes(a) if {
	# add 10 minutes (in nanoseconds) to the creation timestamp and see if it's greater than current time 
	time.parse_rfc3339_ns(a) + ((((10 * 60) * 1000) * 1000) * 1000) > time.now_ns()
}
