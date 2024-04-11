package flags

import (
	"fmt"

	"github.com/spf13/cobra"
)

const (
	// App_BuildMethod is the key for the build method flag
	App_BuildMethod = "build-method"
	// App_Dockerfile is the key for the dockerfile flag
	App_Dockerfile = "dockerfile"
	// App_Builder is the key for the builder flag
	App_Builder = "builder"
	// App_Buildpacks is the key for the buildpacks flag
	App_Buildpacks = "attach-buildpacks"
	// App_BuildContext is the key for the build context flag
	App_BuildContext = "build-context"
	// App_NoBuild is the key for the no build flag
	App_NoBuild = "no-build"
	// App_NoPull is the key for the no pull flag
	App_NoPull = "no-pull"
)

// UseAppBuildFlags adds build flags to the given command
func UseAppBuildFlags(cmd *cobra.Command) {
	cmd.PersistentFlags().String(
		App_BuildMethod,
		"",
		"set the build method for the app on apply, either 'docker' or 'pack'",
	)
	cmd.PersistentFlags().String(
		App_Dockerfile,
		"",
		"set the path to the Dockerfile when build method is 'docker'",
	)
	cmd.PersistentFlags().String(
		App_Builder,
		"",
		"set the builder to use when build method is 'pack'",
	)
	cmd.PersistentFlags().StringSlice(
		App_Buildpacks,
		nil,
		"attach buildpacks to use when build method is 'pack'",
	)
	cmd.PersistentFlags().String(
		App_BuildContext,
		"",
		"set the build context for the app",
	)
}

type buildValues struct {
	BuildMethod  string
	Dockerfile   string
	Builder      string
	Buildpacks   []string
	BuildContext string
}

// AppBuildValuesFromCmd retrieves build values from command flags
func AppBuildValuesFromCmd(cmd *cobra.Command) (buildValues, error) {
	var values buildValues

	buildMethod, err := cmd.Flags().GetString(App_BuildMethod)
	if err != nil {
		return values, fmt.Errorf("error getting build method: %s", err)
	}

	dockerfile, err := cmd.Flags().GetString(App_Dockerfile)
	if err != nil {
		return values, fmt.Errorf("error getting dockerfile: %s", err)
	}

	builder, err := cmd.Flags().GetString(App_Builder)
	if err != nil {
		return values, fmt.Errorf("error getting builder: %s", err)
	}

	buildpacks, err := cmd.Flags().GetStringSlice(App_Buildpacks)
	if err != nil {
		return values, fmt.Errorf("error getting buildpacks: %s", err)
	}

	buildContext, err := cmd.Flags().GetString(App_BuildContext)
	if err != nil {
		return values, fmt.Errorf("error getting build context: %s", err)
	}

	values = buildValues{
		BuildMethod:  buildMethod,
		Dockerfile:   dockerfile,
		Builder:      builder,
		Buildpacks:   buildpacks,
		BuildContext: buildContext,
	}

	return values, nil
}
