package v2

import (
	"context"
	"fmt"
	"strings"

	jsonpatch "github.com/evanphx/json-patch"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/internal/telemetry"
)

// PatchApp applies a set of JSON patch operations to an app proto and returns the modified proto
func PatchApp(ctx context.Context, app *porterv1.PorterApp, ops []PatchOperation) (*porterv1.PorterApp, error) {
	ctx, span := telemetry.NewSpan(ctx, "v2-patch-app")
	defer span.End()

	var patchedApp *porterv1.PorterApp

	if app == nil {
		return patchedApp, telemetry.Error(ctx, span, nil, "no app provided")
	}

	by, err := helpers.MarshalContractObject(ctx, app)
	if err != nil {
		return patchedApp, telemetry.Error(ctx, span, err, "failed to marshal app")
	}

	var opStrs []string

	for _, op := range ops {
		opAsJSON, err := op.String()
		if err != nil {
			return patchedApp, telemetry.Error(ctx, span, err, "failed to convert patch operation to string")
		}

		opStrs = append(opStrs, fmt.Sprintf("\t%s", opAsJSON))
	}

	patchJson := fmt.Sprintf("[\n%s\n]", strings.Join(opStrs, ",\n"))
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "patch-json", Value: patchJson})

	patch, err := jsonpatch.DecodePatch([]byte(patchJson))
	if err != nil {
		return patchedApp, telemetry.Error(ctx, span, err, "failed to decode patch")
	}

	modified, err := patch.Apply(by)
	if err != nil {
		return patchedApp, telemetry.Error(ctx, span, err, "failed to apply patch")
	}

	patchedApp = &porterv1.PorterApp{}

	err = helpers.UnmarshalContractObject(modified, patchedApp)
	if err != nil {
		return patchedApp, telemetry.Error(ctx, span, err, "failed to unmarshal patched app")
	}

	return patchedApp, nil
}
