package web.version

import future.keywords

POLICY_ID := "web_version"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "low"

latest_stable_version := "0.50.0"

POLICY_TITLE := sprintf("The web version for application %s/%s should be at least v%s", [input.namespace, input.name, latest_stable_version])

POLICY_SUCCESS_MESSAGE := sprintf("Success: web version for %s/%s is up-to-date", [input.namespace, input.name])

trimmedVersion := trim_left(input.version, "v")

# semver.compare returns -1 if latest_stable_version < trimmedVersion
allow if semver.compare(latest_stable_version, trimmedVersion) == -1

FAILURE_MESSAGE contains msg if {
	not allow
	msg := sprintf("Failed: latest stable version is %s, but %s/%s is on %s", [latest_stable_version, input.namespace, input.name, trimmedVersion])
}
