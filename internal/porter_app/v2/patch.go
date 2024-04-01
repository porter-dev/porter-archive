package v2

import (
	"context"
	"fmt"
	"strings"

	jsonpatch "github.com/evanphx/json-patch/v5"
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

	modified, err := patch.ApplyWithOptions(by, &jsonpatch.ApplyOptions{
		EnsurePathExistsOnAdd: true,
	})
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

// PatchOperationsFromFlagValuesInput is the input for PatchOperationsFromFlagValues
type PatchOperationsFromFlagValuesInput struct {
	EnvGroups       []string
	BuildMethod     string
	Dockerfile      string
	Builder         string
	Buildpacks      []string
	BuildContext    string
	ImageRepository string
	ImageTag        string
}

// PatchOperationsFromFlagValues converts the flag values into a list of patch operations
func PatchOperationsFromFlagValues(inp PatchOperationsFromFlagValuesInput) []PatchOperation {
	var ops []PatchOperation

	var flags []ApplyFlag

	if inp.EnvGroups != nil {
		flags = append(flags, AttachEnvGroupsFlag{
			EnvGroups: inp.EnvGroups,
		})
	}

	if inp.BuildMethod != "" {
		flags = append(flags, SetBuildMethod{
			Method: inp.BuildMethod,
		})
	}

	if inp.Dockerfile != "" {
		flags = append(flags, SetBuildDockerfile{
			Dockerfile: inp.Dockerfile,
		})
	}

	if inp.Builder != "" {
		flags = append(flags, SetBuilder{
			Builder: inp.Builder,
		})
	}

	if inp.Buildpacks != nil {
		flags = append(flags, AttachBuildpacks{
			Buildpacks: inp.Buildpacks,
		})
	}

	if inp.BuildContext != "" {
		flags = append(flags, SetBuildContext{
			Context: inp.BuildContext,
		})
	}

	if inp.ImageRepository != "" {
		flags = append(flags, SetImageRepo{
			Repo: inp.ImageRepository,
		})
	}

	if inp.ImageTag != "" {
		flags = append(flags, SetImageTag{
			Tag: inp.ImageTag,
		})
	}

	for _, flag := range flags {
		ops = append(ops, flag.AsPatchOperations()...)
	}

	return ops
}
