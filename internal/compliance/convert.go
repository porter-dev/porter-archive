package compliance

import (
	"context"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"
)

// VendorComplianceCheckStatus is used to indicate the status of a compliance check from a vendor
type VendorComplianceCheckStatus string

const (
	// VendorComplianceCheckStatus_Passed is used to indicate that the check has passed
	VendorComplianceCheckStatus_Passed VendorComplianceCheckStatus = "passed"
	// VendorComplianceCheckStatus_Failing is used to indicate that the check is failing
	// this indicates that the check group has an irrecoverable error or that the check group has not been enabled for their infrastructure
	VendorComplianceCheckStatus_Failing VendorComplianceCheckStatus = "failing"
	// VendorComplianceCheckStatus_NotApplicable is used to indicate that the check is not in the realm of responsibility for Porter
	VendorComplianceCheckStatus_NotApplicable VendorComplianceCheckStatus = "not_applicable"
)

// VendorComplianceCheck is used to represent a compliance check from a vendor
type VendorComplianceCheck struct {
	// Check is the name of the check. This a human readable name provided directly by the vendor.
	Check string `json:"check"`
	// CheckGroup refers to the name of the porter internal check group that the check is associated with.
	// The status of the check group is used to resolve the status of the check.
	CheckGroup string `json:"check_group"`
	// Status is the status of the check. This is derived from the status of the check group.
	Status VendorComplianceCheckStatus `json:"status"`
	// Reason is a message indicating why the check is in its current state.
	Reason string `json:"reason"`
	// VendorCheckID is the unique identifier for the check from the vendor.
	VendorCheckID string `json:"vendor_check_id"`
}

// CheckGroupStatus is the status for a check group
type CheckGroupStatus string

const (
	// CheckGroupStatus_Passed is used when all checks in a group have passed
	CheckGroupStatus_Passed CheckGroupStatus = "PASSED"
	// CheckGroupStatus_Failed is used when one or more checks in a group have failed
	CheckGroupStatus_Failed CheckGroupStatus = "FAILED"
)

// CheckGroup is a group of related checks
// Represents multiple infra changes run together to ensure some higher level compliance requirement is met
type CheckGroup struct {
	Name    string           `json:"name"`
	Status  CheckGroupStatus `json:"status"`
	Message string           `json:"message"`
}

// Vendor is used to indicate which vendor the compliance check results are from
type Vendor string

const (
	// Vendor_Vanta is use to indicate that the compliance results are based on checks from Vanta
	Vendor_Vanta Vendor = "vanta"
)

// Profile is used to indicate which compliance profile the compliance check results are from
type Profile string

const (
	// Profile_SOC2 is used to indicate that the check results are for the SOC2 compliance profile
	Profile_SOC2 Profile = "soc2"
	// Profile_HIPAA is used to indicate that the check results are for the HIPAA compliance profile
	Profile_HIPAA Profile = "hipaa"
)

// CheckGroupsFromProto converts the compliance check group proto to the internal representation
func CheckGroupsFromProto(ctx context.Context, checkGroups []*porterv1.ContractComplianceCheckGroup) ([]CheckGroup, error) {
	ctx, span := telemetry.NewSpan(ctx, "compliance-checks-from-proto")
	defer span.End()

	var res []CheckGroup

	for _, cg := range checkGroups {
		var status CheckGroupStatus
		switch cg.Status {
		case porterv1.EnumComplianceCheckStatus_ENUM_COMPLIANCE_CHECK_STATUS_PASSED:
			status = CheckGroupStatus_Passed
		case porterv1.EnumComplianceCheckStatus_ENUM_COMPLIANCE_CHECK_STATUS_FAILED:
			status = CheckGroupStatus_Failed
		default:
			return res, telemetry.Error(ctx, span, nil, "invalid compliance check status")
		}

		res = append(res, CheckGroup{
			Name:    cg.Name,
			Status:  status,
			Message: cg.Message,
		})
	}

	return res, nil
}

// VendorCheckGroupsFromProto converts the vendor compliance check proto to the internal representation
func VendorCheckGroupsFromProto(ctx context.Context, vendorCheck []*porterv1.VendorComplianceCheck) ([]VendorComplianceCheck, error) {
	ctx, span := telemetry.NewSpan(ctx, "vendor-compliance-checks-from-proto")
	defer span.End()

	var res []VendorComplianceCheck

	for _, vc := range vendorCheck {
		var status VendorComplianceCheckStatus
		switch vc.Status {
		case porterv1.EnumComplianceCheckStatus_ENUM_COMPLIANCE_CHECK_STATUS_PASSED:
			status = VendorComplianceCheckStatus_Passed
		case porterv1.EnumComplianceCheckStatus_ENUM_COMPLIANCE_CHECK_STATUS_FAILED:
			status = VendorComplianceCheckStatus_Failing
		case porterv1.EnumComplianceCheckStatus_ENUM_COMPLIANCE_CHECK_STATUS_NOT_APPLICABLE:
			status = VendorComplianceCheckStatus_NotApplicable
		default:
			return res, telemetry.Error(ctx, span, nil, "invalid compliance check status")
		}

		res = append(res, VendorComplianceCheck{
			Check:         vc.Description,
			CheckGroup:    vc.CheckGroup,
			Status:        status,
			Reason:        vc.Reason,
			VendorCheckID: vc.VendorCheckId,
		})
	}

	return res, nil
}
