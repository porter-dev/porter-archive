package config

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/spf13/viper"
)

func (c *CLIConfig) SetDriver(driver string, currentProfile string) error {
	v := CLIConfig{
		Driver: driver,
	}
	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}

// SetHost updates the host for the current profile. This clears the project, cluster, and token as they will not work with the new host
// Trailing slashes will be dropped from the provided host as they may cause issues with the api server
func (c *CLIConfig) SetHost(host string, currentProfile string) error {
	host = strings.TrimRight(host, "/")

	v := defaultCLIConfig()
	v.Host = host

	color.New(color.FgGreen).Printf("Set the current host as %s\n", host)

	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}

// SetProject sets a project for all API commands
func (c *CLIConfig) SetProject(ctx context.Context, apiClient api.Client, projectID uint, selectedProfile string) error {
	color.New(color.FgGreen).Printf("Set the current project as %d\n", projectID)
	v := CLIConfig{
		Project: projectID,
	}
	resp, err := apiClient.ListProjectClusters(ctx, projectID)
	if err == nil {
		clusters := *resp
		if len(clusters) == 1 {
			v.Cluster = clusters[0].ID
		}
	}
	return updateValuesForSelectedProfile(currentProfile, v, porterConfigFilePath)
}

func (c *CLIConfig) SetCluster(clusterID uint) error {
	color.New(color.FgGreen).Printf("Set the current cluster as %d\n", clusterID)

	if c.Kubeconfig != "" || viper.IsSet("kubeconfig") {
		color.New(color.FgYellow).Println("Please change local kubeconfig if needed")
	}

	err := viper.WriteConfig()
	if err != nil {
		return err
	}

	c.Cluster = clusterID

	return nil
}

func (c *CLIConfig) SetToken(token string) error {
	viper.Set("token", token)
	err := viper.WriteConfig()
	if err != nil {
		return err
	}

	c.Token = token

	return nil
}

func (c *CLIConfig) SetRegistry(registryID uint) error {
	viper.Set("registry", registryID)
	color.New(color.FgGreen).Printf("Set the current registry as %d\n", registryID)
	err := viper.WriteConfig()
	if err != nil {
		return err
	}

	c.Registry = registryID

	return nil
}

func (c *CLIConfig) SetHelmRepo(helmRepoID uint) error {
	viper.Set("helm_repo", helmRepoID)
	color.New(color.FgGreen).Printf("Set the current Helm repo as %d\n", helmRepoID)
	err := viper.WriteConfig()
	if err != nil {
		return err
	}

	c.HelmRepo = helmRepoID

	return nil
}

func (c *CLIConfig) SetKubeconfig(kubeconfig string) error {
	path, err := filepath.Abs(kubeconfig)
	if err != nil {
		return err
	}

	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("%s does not exist", path)
	}

	viper.Set("kubeconfig", path)
	color.New(color.FgGreen).Printf("Set the path to kubeconfig as %s\n", path)
	err = viper.WriteConfig()

	if err != nil {
		return err
	}

	c.Kubeconfig = kubeconfig

	return nil
}
