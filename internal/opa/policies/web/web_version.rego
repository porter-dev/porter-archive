package web.version

import future.keywords

POLICY_ID := "web_version"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

# TODO: set the actual latest stable version
latest_stable_version := "0.115.0"

POLICY_TITLE := sprintf("The web version should be at least v%s", [latest_stable_version])

POLICY_SUCCESS_MESSAGE := sprintf("Success: web version is up-to-date", [])

trimmedVersion := trim_left(input.version, "v")

# semver.compare returns -1 if latest_stable_version < trimmedVersion
allow if semver.compare(latest_stable_version, trimmedVersion) == -1

FAILURE_MESSAGE contains msg if {
	not allow
	msg := sprintf("Failed: latest stable version is %s, but you are on %s", [latest_stable_version, trimmedVersion])
}
