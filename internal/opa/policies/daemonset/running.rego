package daemonset.running

import future.keywords.contains
import future.keywords.every
import future.keywords.if
import future.keywords.in

POLICY_ID := "daemonset_running"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("Daemonset %s in namespace %s should have all replicas available", [input.metadata.name, input.metadata.namespace])

POLICY_SUCCESS_MESSAGE := sprintf("Success: daemonset has %d / %d pods running", [input.status.numberReady, input.status.desiredNumberScheduled])

allow if {
	input.status.numberReady == input.status.desiredNumberScheduled
}

FAILURE_MESSAGE contains msg1 if {
	input.status.numberReady != input.status.desiredNumberScheduled
	msg1 := sprintf("Daemonset %s only has %d out of %d pods running", [input.metadata.name, input.status.numberReady, input.status.desiredNumberScheduled])
}
