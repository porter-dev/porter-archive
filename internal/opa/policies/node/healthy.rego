package node.healthy

import future.keywords

POLICY_ID := sprintf("healthy_%s", [input.metadata.name])

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "critical"

POLICY_TITLE := sprintf("The node %s should be healthy", [input.metadata.name])

POLICY_SUCCESS_MESSAGE := sprintf("Success: this node is healthy", [])

# check if one of the node's conditions states that the kubelet is ready
allow if {
	some condition in input.status.conditions
	condition.reason == "KubeletReady"
	condition.status = "True"
}

FAILURE_MESSAGE contains msg if {
	not allow
	msg := sprintf("Failed: the node %s is not healthy", [input.metadata.name])
}
