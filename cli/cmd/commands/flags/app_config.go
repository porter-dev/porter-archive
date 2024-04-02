package flags

import (
	"fmt"

	"github.com/spf13/cobra"
)

const (
	// App_Name is the key for the app name flag
	App_Name = "name"
	// App_ConfigAttachEnvGroups is the key for the attach env groups flag
	App_ConfigAttachEnvGroups = "attach-env-groups"
)

type appConfigValues struct {
	AttachEnvGroups []string
}

// UseAppConfigFlags adds config flags to the given command
func UseAppConfigFlags(cmd *cobra.Command) {
	cmd.PersistentFlags().StringSlice(
		App_ConfigAttachEnvGroups,
		nil,
		"attach environment groups to the app",
	)
}

// AppConfigValuesFromCmd retrieves config values from command flags
func AppConfigValuesFromCmd(cmd *cobra.Command) (appConfigValues, error) {
	var values appConfigValues

	envGroups, err := cmd.Flags().GetStringSlice(App_ConfigAttachEnvGroups)
	if err != nil {
		return values, fmt.Errorf("error getting attach env groups: %w", err)
	}

	values = appConfigValues{
		AttachEnvGroups: envGroups,
	}

	return values, nil
}
