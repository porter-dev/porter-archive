package node.k8s_version

import future.keywords

POLICY_ID := "k8s_version"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

latest_stable_version := "1.21.0"

POLICY_TITLE := sprintf("The Kubernetes version for node %s should be at least v%s", [input.metadata.name, latest_stable_version])

POLICY_SUCCESS_MESSAGE := sprintf("Success: Kubernetes version is up-to-date", [])

trimmedVersion := trim_left(input.status.nodeInfo.kubeletVersion, "v")

# semver.compare returns -1 if latest_stable_version < trimmedVersion
allow if semver.compare(latest_stable_version, trimmedVersion) <= 0

FAILURE_MESSAGE contains msg if {
	not allow
	msg := sprintf("Failed: latest stable version is %s, but node %s is on %s", [latest_stable_version, input.metadata.name, trimmedVersion])
}
