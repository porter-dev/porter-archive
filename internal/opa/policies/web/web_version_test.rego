package web.version

import future.keywords

test_version_too_low if {
	not allow with input as {"version": "v0.49.0"}
}

test_version_allowed if {
	allow with input as {"version": "v1.49.0"}
}

test_version_equal_not_allowed if {
	not allow with input as {"version": latest_stable_version}
}
