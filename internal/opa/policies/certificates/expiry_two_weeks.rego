package certificates.expiry_two_weeks

import future.keywords

POLICY_ID := sprintf("certificates_expiry_two_weeks_%s_%s", [input.metadata.namespace, input.metadata.name])

POLICY_VERSION := "v0.0.1"

POLICY_SEVERITY := "high"

POLICY_TITLE := sprintf("Certificate %s/%s should have longer than 2 weeks left before expiry", [input.metadata.namespace, input.metadata.name])

POLICY_SUCCESS_MESSAGE := sprintf("Success: certificate %s/%s has longer than 2 weeks before expiry", [input.metadata.namespace, input.metadata.name])

allow if {
	not rfc3339_expiry_within_2_weeks(input.status.notAfter)
}

FAILURE_MESSAGE contains msg if {
	rfc3339_expiry_within_2_weeks(input.status.notAfter)
	msg := sprintf("Certificate expires at %s, which is less than 2 weeks from now", [input.status.notAfter])
}

rfc3339_lt(a, b) if {
	time.parse_rfc3339_ns(a) < time.parse_rfc3339_ns(b)
}

rfc3339_expiry_within_2_weeks(a) if {
	time.add_date(time.parse_rfc3339_ns(a), 0, 0, -14) < time.now_ns()
}
