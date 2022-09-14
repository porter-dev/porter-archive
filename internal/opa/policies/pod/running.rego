package pod.running

import future.keywords.contains
import future.keywords.every
import future.keywords.if
import future.keywords.in

# TODO: this file needs a lot of work to capture all pod statuses and container statuses. 
# It currently only checks if a pod is in a "Running" status and if all containers are in
# running status.
POLICY_ID := "pod_running"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("Pod %s in namespace %s should be running", [input.metadata.name, input.metadata.namespace])

POLICY_SUCCESS_MESSAGE := sprintf("Success: pod is running", [])

allow if {
	input.status.phase == "Running"

	every containerStatus in input.status.containerStatuses {
		containerStatus.state.running
	}
}

FAILURE_MESSAGE contains msg1 if {
	input.status.phase != "Running"
	msg1 := sprintf("Pod %s does not have a Running status", [input.metadata.name])
}

FAILURE_MESSAGE contains msg2 if {
	some containerStatus in input.status.containerStatuses
	not containerStatus.state.running
	msg2 := sprintf("Container %s in pod %s is not running", [containerStatus.name, input.metadata.name])
}
