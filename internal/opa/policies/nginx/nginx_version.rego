package nginx.version

import future.keywords.if

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

# TODO: set the actual latest stable version
latest_stable_version := "0.4.18"

POLICY_TITLE := sprintf("The NGINX version should be at least v%s", [latest_stable_version])

trimmedVersion := trim_left(input.version, "v")

# semver.compare returns -1 if latest_stable_version < trimmedVersion
allow if semver.compare(latest_stable_version, trimmedVersion) == -1

POLICY_MESSAGE := sprintf("Success: NGINX version is up-to-date", []) if allow

else := sprintf("Failed: latest stable version is %s, but you are on %s", [latest_stable_version, trimmedVersion]) {
	true
}
