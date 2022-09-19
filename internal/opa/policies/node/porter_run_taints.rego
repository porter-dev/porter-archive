package node.porter_run_taints

import future.keywords

POLICY_ID := sprintf("porter_run_taints_%s", [input.metadata.name])

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("The only taints on node %s should be porter.run/workload-kind=system", [input.metadata.name])

POLICY_SUCCESS_MESSAGE := sprintf("Success: this node either has no taints, or has a taint with key porter.run/workload-kind", [])

# if there are no taints, allow the condition
allow if {
	not input.spec.taints[0]
}

# if there is a taint with the key porter.run/workload-kind, allow the condition
allow if {
	input.spec.taints[0].key == "porter.run/workload-kind"
	input.spec.taints[0].effect == "NoSchedule"
}

FAILURE_MESSAGE contains msg1 if {
	not allow
	msg1 := sprintf("Failed: the only permitted taints must contain the key porter.run/workload-kind", [])
}

FAILURE_MESSAGE contains msg2 if {
	not allow
	not input.spec.taints[0].key == "porter.run/workload-kind"
	msg2 := sprintf("Taint has key %s", [input.spec.taints[0].key])
}

FAILURE_MESSAGE contains msg3 if {
	not allow
	not input.spec.taints[0].effect == "NoSchedule"
	msg3 := sprintf("Taint has effect %s", [input.spec.taints[0].effect])
}
