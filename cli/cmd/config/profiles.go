package config

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/fatih/color"
	"github.com/sethvargo/go-envconfig"
	"gopkg.in/yaml.v2"
)

// ProfilesConfig is the top level config from the porter config file, containing all possible profiles.
// This is only used when parsing and writing, and should now be passed around as config.
// Instead, pass the specific profile to the relevant functions
type ProfilesConfig struct {
	CurrentProfile string               `yaml:"current_profile" env:"PORTER_PROFILE,default=default"`
	Profiles       map[string]CLIConfig `yaml:"profiles"`
}

var defaultProfileName string = "default"

// migrateExistingConfigYaml moves the existing config layout to the new config layout with profiles support.
// This can be deprecated after 2025-01-01 as all tokens which were part of the old config, will have expired, meaning all users
// will have had to log out
func migrateExistingConfigYaml(configPath string) error {
	fi, err := os.ReadFile(filepath.Clean(configPath))
	if err != nil {
		return fmt.Errorf("error reading config file: %w", err)
	}

	// handle edge case where numbers are stored as strings for some values
	var existingConfig map[string]any
	err = yaml.Unmarshal(fi, &existingConfig)
	if err != nil {
		return fmt.Errorf("config file is invalid yaml: %w", err)
	}
	for k, v := range existingConfig {
		stringValue, ok := v.(string)
		if ok {
			valueAsInt, err := strconv.Atoi(stringValue)
			if err == nil {
				existingConfig[k] = valueAsInt
			}
		}
	}

	by, err := yaml.Marshal(existingConfig)
	if err != nil {
		return fmt.Errorf("unable to marshal existing config to bytes: %w", err)
	}

	var c CLIConfig
	err = yaml.Unmarshal(by, &c)
	if err != nil {
		return fmt.Errorf("config file is invalid yaml: %w", err)
	}

	err = updateValuesForSelectedProfile(defaultProfileName, configPath, withCLIConfig(c))
	if err != nil {
		return fmt.Errorf("unable to write migrated default config to file: %w", err)
	}
	err = updateCurrentProfileInFile(defaultProfileName, configPath)
	if err != nil {
		return fmt.Errorf("unable to update current_profile in config file: %w", err)
	}

	return nil
}

// writeProfileToProfilesConfigFile will write the given profile config to file, overwriting the entire existing file.
// Ensure to call readProfilesConfigFromFile before running this function if you with to preserve current settings,
// or call updateValuesForSelectedProfile to set specific values for a given profile
func writeProfileToProfilesConfigFile(profilesConfig ProfilesConfig, configPath string) error {
	by, err := yaml.Marshal(profilesConfig)
	if err != nil {
		return fmt.Errorf("error marshalling profiles config: %w", err)
	}
	err = os.WriteFile(configPath, by, os.ModePerm)
	if err != nil {
		return fmt.Errorf("error writing profiles config to file")
	}
	return nil
}

// updateCurrentProfileInFile changes the current_profile that is selected in the file for the next run.
func updateCurrentProfileInFile(newProfile string, configPath string) error {
	if newProfile == "" {
		return errors.New("cannot update profile to an empty profile")
	}

	profilesConfig, err := readProfilesConfigFromFile(configPath)
	if err != nil {
		return fmt.Errorf("error reading profiles config file for updating current profile: %w", err)
	}
	profilesConfig.CurrentProfile = newProfile

	err = writeProfileToProfilesConfigFile(profilesConfig, configPath)
	if err != nil {
		return fmt.Errorf("unable to update current profile in config file: %w", err)
	}

	return nil
}

// updateValuesForSelectedProfile updates config for a given profile. This can be used with the --profile flag or the PORTER_PROFILE env var,
// and will not necessarily update the current_profile in the config file.
func updateValuesForSelectedProfile(selectedProfile string, configPath string, updatedCLIValues ...cliConfigValue) error {
	if selectedProfile == "" {
		return errors.New("must specify a profile to update")
	}

	profilesConfig, err := readProfilesConfigFromFile(configPath)
	if err != nil {
		return fmt.Errorf("error reading profiles config file for updating selected profile: %w", err)
	}
	if profilesConfig.Profiles == nil {
		profilesConfig.Profiles = map[string]CLIConfig{
			selectedProfile: defaultCLIConfig(),
		}
	}

	if _, ok := profilesConfig.Profiles[selectedProfile]; !ok {
		profilesConfig.Profiles[selectedProfile] = defaultCLIConfig()
	}

	baseProfile := profilesConfig.Profiles[selectedProfile]
	for _, v := range updatedCLIValues {
		v(&baseProfile)
	}

	profilesConfig.Profiles[selectedProfile] = baseProfile

	err = writeProfileToProfilesConfigFile(profilesConfig, configPath)
	if err != nil {
		return fmt.Errorf("unable to update current profile in config file: %w", err)
	}
	return nil
}

// readProfilesConfigFromFile reads the config file which supports profiles
func readProfilesConfigFromFile(configPath string) (ProfilesConfig, error) {
	var profiles ProfilesConfig
	fi, err := os.ReadFile(filepath.Clean(configPath))
	if err != nil {
		return profiles, fmt.Errorf("error reading config file: %w", err)
	}

	err = yaml.Unmarshal(fi, &profiles)
	if err != nil {
		return profiles, fmt.Errorf("config file is invalid yaml: %w", err)
	}
	return profiles, nil
}

// defaultCLIConfig sets the default values for give profile
func defaultCLIConfig() CLIConfig {
	return CLIConfig{
		Driver:   "local",
		Host:     "https://dashboard.getporter.dev",
		Project:  0,
		Cluster:  0,
		Token:    "",
		Registry: 0,
		HelmRepo: 0,
	}
}

// ensurePorterConfigDirectoryExists checks that the .porter folder exists, and creates it if it doesn't exist
func ensurePorterConfigDirectoryExists() error {
	_, err := os.Stat(defaultPorterConfigDir)
	if err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("error reading porter directory: %w", err)
		}
		err = os.Mkdir(defaultPorterConfigDir, 0o700)
		if err != nil {
			return fmt.Errorf("error creating porter directory: %w", err)
		}
	}
	return nil
}

// ensurePorterConfigFileExists checks that the porter.yaml config file exists, and creates it if it doesn't exist
func ensurePorterConfigFileExists() error {
	_, err := os.Stat(porterConfigFilePath)
	if err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("error reading porter config file: %w", err)
		}
		by, _ := yaml.Marshal(defaultCLIConfig())
		err = os.WriteFile(porterConfigFilePath, by, 0o664)
		if err != nil {
			if !errors.Is(err, os.ErrExist) {
				return fmt.Errorf("error creating porter config file: %w", err)
			}
		}
	}
	return nil
}

// overlayProfiles will add all values from the profileToOverlay to the baseProfile,
// returning the new profile with both values
//
//nolint:unparam
func overlayProfiles(baseProfile CLIConfig, profileToOverlay CLIConfig) (CLIConfig, error) {
	if profileToOverlay.Cluster != 0 {
		baseProfile.Cluster = profileToOverlay.Cluster
	}
	if profileToOverlay.Driver != "" {
		baseProfile.Driver = profileToOverlay.Driver
	}
	if profileToOverlay.HelmRepo != 0 {
		baseProfile.HelmRepo = profileToOverlay.HelmRepo
	}
	if profileToOverlay.Host != "" {
		baseProfile.Host = profileToOverlay.Host
	}
	if profileToOverlay.Kubeconfig != "" {
		baseProfile.Kubeconfig = profileToOverlay.Kubeconfig
	}
	if profileToOverlay.Project != 0 {
		baseProfile.Project = profileToOverlay.Project
	}
	if profileToOverlay.Registry != 0 {
		baseProfile.Registry = profileToOverlay.Registry
	}
	if profileToOverlay.Token != "" {
		baseProfile.Token = profileToOverlay.Token
	}
	return baseProfile, nil
}

// configForProfileFromConfigFile gets the profile for the current_profile specified in the porter config file
func configForProfileFromConfigFile(selectedProfile string, configPath string) (CLIConfig, string, error) {
	if selectedProfile == "" {
		selectedProfile = defaultProfileName
	}

	profilesConfig, err := readProfilesConfigFromFile(configPath)
	if err != nil {
		return CLIConfig{}, selectedProfile, fmt.Errorf("error reading profiles config file: %w", err)
	}

	if selectedProfile == defaultProfileName {
		if profilesConfig.CurrentProfile != "" {
			selectedProfile = profilesConfig.CurrentProfile
		}
	}

	if profilesConfig.CurrentProfile == "" && len(profilesConfig.Profiles) == 0 {
		err := migrateExistingConfigYaml(configPath)
		if err != nil {
			return CLIConfig{}, selectedProfile, fmt.Errorf("error migrating porter.yaml config file. Please delete file at %s. %w", configPath, err)
		}

		migrated, selectedProfile, err := configForProfileFromConfigFile(selectedProfile, configPath)
		if err != nil {
			return CLIConfig{}, selectedProfile, fmt.Errorf("error migrating existing porter.yaml to support profiles: %w", err)
		}
		return migrated, selectedProfile, nil
	}

	configFile, ok := profilesConfig.Profiles[selectedProfile]
	if !ok {
		_, _ = color.New(color.FgGreen).Printf("Porter profile '%s' does not exist. Creating one now...\n", currentProfile)
		err = updateValuesForSelectedProfile(selectedProfile, configPath, withCLIConfig(defaultCLIConfig()))
		if err != nil {
			return CLIConfig{}, selectedProfile, fmt.Errorf("error creating new profile: %w", err)
		}
	}
	return configFile, selectedProfile, nil
}

// profileConfigFromEnvVars parses any environment variables that may be setting
// config values, such as PORTER_HOST and PORTER_PROJECT
func profileConfigFromEnvVars(ctx context.Context) (CLIConfig, error) {
	var c CLIConfig
	if err := envconfig.Process(ctx, &c); err != nil {
		return c, fmt.Errorf("error processing porter env vars: %w", err)
	}
	return c, nil
}
