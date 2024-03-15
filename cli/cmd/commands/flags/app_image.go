package flags

import (
	"fmt"

	"github.com/spf13/cobra"
)

const (
	// App_ImageTag is the key for the image tag flag
	App_ImageTag = "tag"
	// App_ImageRepository is the key for the image repository flag
	App_ImageRepository = "image-repository"
)

// UseAppImageFlags adds image flags to the given command
func UseAppImageFlags(cmd *cobra.Command) {
	cmd.PersistentFlags().String(
		App_ImageTag,
		"",
		"set the image tag used for the application (overrides field in yaml)",
	)
	cmd.PersistentFlags().String(
		App_ImageTag,
		"",
		"set the image repository to use for the app",
	)
}

type imageValues struct {
	Tag        string
	Repository string
}

// AppImageValuesFromCmd retrieves image values from command flags
func AppImageValuesFromCmd(cmd *cobra.Command) (imageValues, error) {
	var values imageValues

	tag, err := cmd.Flags().GetString(App_ImageTag)
	if err != nil {
		return values, fmt.Errorf("error getting tag: %w", err)
	}

	repo, err := cmd.Flags().GetString(App_ImageRepository)
	if err != nil {
		return values, fmt.Errorf("error getting repository: %w", err)
	}

	values = imageValues{
		Tag:        tag,
		Repository: repo,
	}

	return values, nil
}
