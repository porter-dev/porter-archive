package porter_app

import (
	"fmt"

	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
	"github.com/spf13/cobra"
)

// PatchOperationsFromFlags converts the flags set on the command into a list of json patch operations that can be used to modify an app
func PatchOperationsFromFlags(cmd *cobra.Command) ([]v2.PatchOperation, error) {
	var ops []v2.PatchOperation

	var flags []v2.ApplyFlag
	envGroups, err := cmd.Flags().GetStringSlice("attach-env-groups")
	if err != nil {
		return ops, fmt.Errorf("error parsing attach-env-groups flag: %s", err)
	}
	if envGroups != nil {
		flags = append(flags, v2.AttachEnvGroupsFlag{
			EnvGroups: envGroups,
		})
	}

	buildMethod, err := cmd.Flags().GetString("build-method")
	if err != nil {
		return ops, fmt.Errorf("error parsing build-method flag: %s", err)
	}
	if buildMethod != "" {
		flags = append(flags, v2.SetBuildMethod{
			Method: buildMethod,
		})
	}

	dockerFile, err := cmd.Flags().GetString("dockerfile")
	if err != nil {
		return ops, fmt.Errorf("error parsing dockerfile flag: %s", err)
	}
	if dockerFile != "" {
		flags = append(flags, v2.SetBuildDockerfile{
			Dockerfile: dockerFile,
		})
	}

	builder, err := cmd.Flags().GetString("builder")
	if err != nil {
		return ops, fmt.Errorf("error parsing builder flag: %s", err)
	}
	if builder != "" {
		flags = append(flags, v2.SetBuilder{
			Builder: builder,
		})
	}

	buildpacks, err := cmd.Flags().GetStringSlice("attach-buildpacks")
	if err != nil {
		return ops, fmt.Errorf("error parsing attach-buildpacks flag: %s", err)
	}
	if buildpacks != nil {
		flags = append(flags, v2.AttachBuildpacks{
			Buildpacks: buildpacks,
		})
	}

	buildContext, err := cmd.Flags().GetString("build-context")
	if err != nil {
		return ops, fmt.Errorf("error parsing build-context flag: %s", err)
	}
	if buildContext != "" {
		flags = append(flags, v2.SetBuildContext{
			Context: buildContext,
		})
	}

	imageRepository, err := cmd.Flags().GetString("image-repository")
	if err != nil {
		return ops, fmt.Errorf("error parsing image-repository flag: %s", err)
	}
	if imageRepository != "" {
		flags = append(flags, v2.SetImageRepo{
			Repo: imageRepository,
		})
	}

	imageTag, err := cmd.Flags().GetString("tag")
	if err != nil {
		return ops, fmt.Errorf("error parsing tag flag: %s", err)
	}
	if imageTag != "" {
		flags = append(flags, v2.SetImageTag{
			Tag: imageTag,
		})
	}

	for _, flag := range flags {
		ops = append(ops, flag.AsPatchOperations()...)
	}

	return ops, nil
}
