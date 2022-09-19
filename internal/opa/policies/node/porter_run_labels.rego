package node.porter_run_labels

import future.keywords

POLICY_ID := "porter_run_labels"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("The node %s should have the label porter.run/workload-kind", [input.metadata.name])

POLICY_SUCCESS_MESSAGE := sprintf("Success: this node has the label porter.run/workload-kind", [])

# determine if the label porter.run/workload-kind exists
allow if {
	input.metadata.labels["porter.run/workload-kind"]
}

FAILURE_MESSAGE contains msg if {
	not allow
	msg := sprintf("Failed: the node %s does not have the label porter.run/workload-kind", [input.metadata.name])
}
