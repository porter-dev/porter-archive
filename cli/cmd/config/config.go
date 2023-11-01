package config

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"k8s.io/client-go/util/homedir"
)

var (
	// These values are globals to reduce the size of the refactor.
	// These should be passed around
	home                               = homedir.HomeDir()
	defaultPorterConfigFileName string = "porter.yaml"
	defaultPorterConfigDir      string = filepath.Join(home, ".porter")
	porterConfigFilePath        string = filepath.Clean(filepath.Join(defaultPorterConfigDir, defaultPorterConfigFileName))
	// currentProfile is used to set the profile for which any applied setting should be read or set
	currentProfile string = "default"
)

// CLIConfig is the set of shared configuration options for the CLI commands.
// This config is used by viper: calling Set() function for any parameter will
// update the corresponding field in the viper config file.
type CLIConfig struct {
	// Driver can be either "docker" or "local", and represents which driver is
	// used to run an instance of the server.
	Driver     string `yaml:"driver" env:"PORTER_DRIVER"`
	Host       string `yaml:"host" env:"PORTER_HOST"`
	Project    uint   `yaml:"project" env:"PORTER_PROJECT"`
	Cluster    uint   `yaml:"cluster" env:"PORTER_CLUSTER"`
	Token      string `yaml:"token" env:"PORTER_TOKEN"`
	Registry   uint   `yaml:"registry" env:"PORTER_REGISTRY"`
	HelmRepo   uint   `yaml:"helm_repo" env:"PORTER_HELM_REPO"`
	Kubeconfig string `yaml:"kubeconfig" env:"PORTER_KUBECONFIG"`
}

// FeatureFlags are any flags that are relevant to the feature set of the CLI. This should not include all feature flags, only those relevant to client-side CLI operations
type FeatureFlags struct {
	// ValidateApplyV2Enabled is a project-wide flag for checking if `porter apply` with porter.yaml is enabled
	ValidateApplyV2Enabled bool
}

// InitAndLoadConfig populates the config object with the following precedence rules:
// 1. flag
// 2. env
// 3. config
// 4. default
// If flagsConfig and envConfig are empty, then the default values or config file values will be preferred.
// This returns the config which should be applied to all subsequent requests, as well as the current profile that the command was run with
func InitAndLoadConfig(ctx context.Context, flagsProfile string, flagsConfig CLIConfig) (CLIConfig, string, error) {
	var config CLIConfig

	err := ensurePorterConfigDirectoryExists()
	if err != nil {
		return config, "", fmt.Errorf("unable to get or create porter directory: %w", err)
	}
	err = ensurePorterConfigFileExists()
	if err != nil {
		return config, "", fmt.Errorf("unable to get or create porter config file: %w", err)
	}

	defaultConfig := defaultCLIConfig()
	currentProfile := defaultProfileName

	currentProfileConfig, configFileProfile, err := configForProfileFromConfigFile(currentProfile, porterConfigFilePath)
	if err != nil {
		return config, currentProfile, fmt.Errorf("unable to read profile variables from config file")
	}

	if configFileProfile != "" {
		currentProfile = configFileProfile
	}
	envProfile := os.Getenv("PORTER_PROFILE")
	if envProfile != "" {
		currentProfile = envProfile
	}
	if flagsProfile != "" {
		currentProfile = flagsProfile
	}

	overlayedCurrentProfileConfig, err := overlayProfiles(defaultConfig, currentProfileConfig)
	if err != nil {
		return config, currentProfile, fmt.Errorf("unable to overlay profile onto default values")
	}

	envVarsConfig, err := profileConfigFromEnvVars(ctx)
	if err != nil {
		return config, currentProfile, fmt.Errorf("unable to read profile variables from env vars")
	}

	overlayedEnvVarsConfig, err := overlayProfiles(overlayedCurrentProfileConfig, envVarsConfig)
	if err != nil {
		return config, currentProfile, fmt.Errorf("unable to overlay env vars profile onto values in porter config file")
	}

	configWithAllOverlays, err := overlayProfiles(overlayedEnvVarsConfig, flagsConfig)
	if err != nil {
		return config, currentProfile, fmt.Errorf("unable to overlay onto env vars config values onto flag values values")
	}

	return configWithAllOverlays, currentProfile, nil
}
