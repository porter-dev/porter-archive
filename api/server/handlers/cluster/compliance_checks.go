package cluster

import (
	"net/http"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/compliance"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListComplianceChecksHandler is the handler for /compliance/checks
type ListComplianceChecksHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewListComplianceChecksHandler returns a new ListComplianceChecksHandler
func NewListComplianceChecksHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListComplianceChecksHandler {
	return &ListComplianceChecksHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ListComplianceChecksRequest is the expected format for a request to /compliance/checks
type ListComplianceChecksRequest struct {
	Vendor compliance.Vendor `schema:"vendor"`
}

// ListComplianceChecksResponse is the expected format for a response from /compliance/checks
type ListComplianceChecksResponse struct {
	CheckGroups  []compliance.CheckGroup            `json:"check_groups,omitempty"`
	VendorChecks []compliance.VendorComplianceCheck `json:"vendor_checks,omitempty"`
}

func (c *ListComplianceChecksHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-compliance-checks")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &ListComplianceChecksRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var vendor porterv1.EnumComplianceVendor
	if request.Vendor != "" {
		switch request.Vendor {
		case compliance.Vendor_Vanta:
			vendor = porterv1.EnumComplianceVendor_ENUM_COMPLIANCE_VENDOR_VANTA
		default:
			err := telemetry.Error(ctx, span, nil, "invalid vendor")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}
	}

	req := connect.NewRequest(&porterv1.ContractComplianceChecksRequest{
		ProjectId: int64(project.ID),
		ClusterId: int64(cluster.ID),
		Vendor:    vendor,
	})

	ccpResp, err := c.Config().ClusterControlPlaneClient.ContractComplianceChecks(ctx, req)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error calling ccp for contract compliance checks")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	if ccpResp.Msg == nil {
		err := telemetry.Error(ctx, span, err, "ccp resp msg is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	cgs, err := compliance.CheckGroupsFromProto(ctx, ccpResp.Msg.CheckGroups)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error converting compliance check groups from proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "num-check-groups", Value: len(cgs)})

	vendorChecks, err := compliance.VendorCheckGroupsFromProto(ctx, ccpResp.Msg.VendorChecks)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error converting vendor compliance check groups from proto")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "num-vendor-checks", Value: len(vendorChecks)})

	resp := &ListComplianceChecksResponse{
		CheckGroups:  cgs,
		VendorChecks: vendorChecks,
	}

	c.WriteResult(w, r, resp)
	w.WriteHeader(http.StatusOK)
}
