package cert_manager.version

import future.keywords

POLICY_ID := "cert_manager_version"

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

latest_stable_version := "1.5.5"

POLICY_TITLE := sprintf("The cert-manager version should be at least v%s", [latest_stable_version])

POLICY_SUCCESS_MESSAGE := sprintf("Success: cert-manager version is up-to-date", [])

trimmedVersion := trim_left(input.version, "v")

# semver.compare returns -1 if latest_stable_version < trimmedVersion
allow if semver.compare(latest_stable_version, trimmedVersion) <= 0

FAILURE_MESSAGE contains msg if {
	not allow
	msg := sprintf("Failed: latest stable version is %s, but you are on %s", [latest_stable_version, trimmedVersion])
}
