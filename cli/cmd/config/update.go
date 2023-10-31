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
	v := CLIConfig{
		Driver: driver,
	}
	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}

// SetHost updates the host for the current profile. This clears the project, cluster, and token as they will not work with the new host
// Trailing slashes will be dropped from the provided host as they may cause issues with the api server
func SetHost(host string, currentProfile string) error {
	host = strings.TrimRight(host, "/")

	v := defaultCLIConfig()
	v.Host = host

	color.New(color.FgGreen).Printf("Set the current host as %s\n", host) //nolint:errcheck,gosec

	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}

// SetProject sets a project for all API commands
func SetProject(projectID uint, currentProfile string) error {
	color.New(color.FgGreen).Printf("Set the current project as %d\n", projectID) //nolint:errcheck,gosec

	v := CLIConfig{
		Project: projectID,
	}

	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}

// SetCluster sets the cluster in the current profile. All further actions will be targeted at this cluster
func SetCluster(clusterID uint, currentProfile string) error {
	color.New(color.FgGreen).Printf("Set the current cluster as %d\n", clusterID) //nolint:errcheck,gosec

	v := CLIConfig{
		Cluster:    clusterID,
		Kubeconfig: "",
	}
	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}

// SetToken sets the token in the current profile. All further actions will be authenticated with this token
func SetToken(token string, currentProfile string) error {
	v := CLIConfig{
		Token: token,
	}
	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}

// SetRegistry sets the docker registry in the current profile. All further actions will be targeted at this registry
func SetRegistry(registryID uint) error {
	color.New(color.FgGreen).Printf("Set the current registry as %d\n", registryID) //nolint:errcheck,gosec
	v := CLIConfig{
		Registry: registryID,
	}
	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}

// SetHelmRepo sets the helm repo in the current profile. All further actions will be targeted at this helm repo
func SetHelmRepo(helmRepoID uint) error {
	color.New(color.FgGreen).Printf("Set the current Helm repo as %d\n", helmRepoID) //nolint:errcheck,gosec
	v := CLIConfig{
		HelmRepo: helmRepoID,
	}
	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
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

	v := CLIConfig{
		Kubeconfig: kubeconfig,
	}
	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}
