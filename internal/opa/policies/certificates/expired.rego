package certificates.expired

import future.keywords

POLICY_ID := sprintf("certificates_expired_%s_%s", [input.metadata.namespace, input.metadata.name])

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "critical"

POLICY_TITLE := sprintf("Certificate %s/%s should not be expired", [input.metadata.namespace, input.metadata.name])

POLICY_SUCCESS_MESSAGE := sprintf("Success: certificate %s/%s is not expired", [input.metadata.namespace, input.metadata.name])

allow if {
	not rfc3339_expired(input.status.notAfter)
}

FAILURE_MESSAGE contains msg if {
	rfc3339_expired(input.status.notAfter)
	msg := sprintf("Certificate expired at %s", [input.status.notAfter])
}

rfc3339_expired(a) if {
	time.parse_rfc3339_ns(a) < time.now_ns()
}
