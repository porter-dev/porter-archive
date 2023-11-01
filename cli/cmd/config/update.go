package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
)

// SetProfile sets the current profile to the supplied name. If one does not exist, it will be created
func SetProfile(currentProfile string) error {
	fmt.Println("Setting profile to", currentProfile)
	err := updateCurrentProfileInFile(currentProfile, porterConfigFilePath)
	if err != nil {
		return fmt.Errorf("unable to update current profile in file: %w", err)
	}
	return nil
}

// SetDriver sets the driver used when building images. This can either be locla or github
func SetDriver(driver string, currentProfile string) error {
	return updateValuesForSelectedProfile(currentProfile, porterConfigFilePath, withDriver(driver))
}

// SetHost updates the host for the current profile. This clears the project, cluster, and token as they will not work with the new host
// Trailing slashes will be dropped from the provided host as they may cause issues with the api server
func SetHost(host string, currentProfile string) error {
	host = strings.TrimRight(host, "/")

	color.New(color.FgGreen).Printf("Set the current host as %s\n", host) //nolint:errcheck,gosec

	return updateValuesForSelectedProfile(currentProfile, porterConfigFilePath, withHost(host))
}

// SetProject sets a project for all API commands
func SetProject(projectID uint, currentProfile string) error {
	color.New(color.FgGreen).Printf("Set the current project as %d\n", projectID) //nolint:errcheck,gosec

	return updateValuesForSelectedProfile(currentProfile, porterConfigFilePath, withProjectID(projectID))
}

// SetCluster sets the cluster in the current profile. All further actions will be targeted at this cluster
func SetCluster(clusterID uint, currentProfile string) error {
	color.New(color.FgGreen).Printf("Set the current cluster as %d\n", clusterID) //nolint:errcheck,gosec
	return updateValuesForSelectedProfile(currentProfile, porterConfigFilePath, withClusterID(clusterID), withKubeconfig(""))
}

// SetToken sets the token in the current profile. All further actions will be authenticated with this token
func SetToken(token string, currentProfile string) error {
	return updateValuesForSelectedProfile(currentProfile, porterConfigFilePath, withToken(token))
}

// SetRegistry sets the docker registry in the current profile. All further actions will be targeted at this registry
func SetRegistry(registryID uint) error {
	color.New(color.FgGreen).Printf("Set the current registry as %d\n", registryID) //nolint:errcheck,gosec
	return updateValuesForSelectedProfile(currentProfile, porterConfigFilePath, withRegistryID(registryID))
}

// SetHelmRepo sets the helm repo in the current profile. All further actions will be targeted at this helm repo
func SetHelmRepo(helmRepoID uint) error {
	color.New(color.FgGreen).Printf("Set the current Helm repo as %d\n", helmRepoID) //nolint:errcheck,gosec

	return updateValuesForSelectedProfile(currentProfile, porterConfigFilePath, withHelmRepoID(helmRepoID))
}

// SetKubeconfig sets the kubeconfig in the current profile. All further actions which require kubernetes will be targeted at this kubeconfig
func SetKubeconfig(kubeconfig string) error {
	path, err := filepath.Abs(kubeconfig)
	if err != nil {
		return err
	}

	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("%s does not exist", path)
	}

	color.New(color.FgGreen).Printf("Set the path to kubeconfig as %s\n", path) //nolint:errcheck,gosec

	return updateValuesForSelectedProfile(currentProfile, porterConfigFilePath, withKubeconfig(kubeconfig))
}

// cliConfigValue allows for overridden CLI config values allowing for default values, without requiring nil.
type cliConfigValue func(*CLIConfig)

func withClusterID(clusterID uint) cliConfigValue {
	return func(c *CLIConfig) {
		c.Cluster = clusterID
	}
}

func withToken(token string) cliConfigValue {
	return func(c *CLIConfig) {
		c.Token = token
	}
}

func withRegistryID(registryID uint) cliConfigValue {
	return func(c *CLIConfig) {
		c.Registry = registryID
	}
}

func withHelmRepoID(helmRepoID uint) cliConfigValue {
	return func(c *CLIConfig) {
		c.HelmRepo = helmRepoID
	}
}

func withKubeconfig(kubeconfig string) cliConfigValue {
	return func(c *CLIConfig) {
		c.Kubeconfig = kubeconfig
	}
}

func withHost(host string) cliConfigValue {
	return func(c *CLIConfig) {
		c.Host = host
	}
}

func withProjectID(projectID uint) cliConfigValue {
	return func(c *CLIConfig) {
		c.Project = projectID
	}
}

func withDriver(driver string) cliConfigValue {
	return func(c *CLIConfig) {
		c.Driver = driver
	}
}

// withCLIConfig will completely override the CLI config with the provided one
func withCLIConfig(newConfig CLIConfig) cliConfigValue {
	return func(c *CLIConfig) {
		c = &newConfig
	}
}
