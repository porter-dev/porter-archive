package config

import (
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/viper"
	"k8s.io/client-go/util/homedir"
)

var home = homedir.HomeDir()

// config is a shared object used by all commands
var config = &CLIConfig{}

// CLIConfig is the set of shared configuration options for the CLI commands.
// This config is used by viper: calling Set() function for any parameter will
// update the corresponding field in the viper config file.
type CLIConfig struct {
	// Driver can be either "docker" or "local", and represents which driver is
	// used to run an instance of the server.
	Driver string `yaml:"driver"`

	Host    string `yaml:"host"`
	Project uint   `yaml:"project"`
	Cluster uint   `yaml:"cluster"`

	Token string `yaml:"token"`

	Registry   uint   `yaml:"registry"`
	HelmRepo   uint   `yaml:"helm_repo"`
	Kubeconfig string `yaml:"kubeconfig"`
}

// InitAndLoadConfig populates the config object with the following precedence rules:
// 1. flag
// 2. env
// 3. config
// 4. default
//
// It populates the shared config object above
func InitAndLoadConfig() {
	initAndLoadConfig(config)
}

func InitAndLoadNewConfig() *CLIConfig {
	newConfig := &CLIConfig{}

	initAndLoadConfig(newConfig)

	return newConfig
}

func initAndLoadConfig(_config *CLIConfig) {
	initFlagSet()

	// check that the .porter folder exists; create if not
	porterDir := filepath.Join(home, ".porter")

	if _, err := os.Stat(porterDir); os.IsNotExist(err) {
		os.Mkdir(porterDir, 0700)
	} else if err != nil {
		color.New(color.FgRed).Printf("%v\n", err)
		os.Exit(1)
	}

	viper.SetConfigName("porter")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(porterDir)

	// Bind the flagset initialized above
	viper.BindPFlags(utils.DriverFlagSet)
	viper.BindPFlags(utils.DefaultFlagSet)
	viper.BindPFlags(utils.RegistryFlagSet)
	viper.BindPFlags(utils.HelmRepoFlagSet)

	// Bind the environment variables with prefix "PORTER_"
	viper.SetEnvPrefix("PORTER")
	viper.BindEnv("host")
	viper.BindEnv("project")
	viper.BindEnv("cluster")
	viper.BindEnv("token")

	err := viper.ReadInConfig()

	if err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// create blank config file
			err := ioutil.WriteFile(filepath.Join(home, ".porter", "porter.yaml"), []byte{}, 0644)

			if err != nil {
				color.New(color.FgRed).Printf("%v\n", err)
				os.Exit(1)
			}
		} else {
			// Config file was found but another error was produced
			color.New(color.FgRed).Printf("%v\n", err)
			os.Exit(1)
		}
	}

	// unmarshal the config into the shared config struct
	viper.Unmarshal(_config)
}

// initFlagSet initializes the shared flags used by multiple commands
func initFlagSet() {
	utils.DriverFlagSet.StringVar(
		&config.Driver,
		"driver",
		"local",
		"driver to use (local or docker)",
	)

	utils.DefaultFlagSet.StringVar(
		&config.Host,
		"host",
		"https://dashboard.getporter.dev",
		"host URL of Porter instance",
	)

	utils.DefaultFlagSet.UintVar(
		&config.Project,
		"project",
		0,
		"project ID of Porter project",
	)

	utils.DefaultFlagSet.UintVar(
		&config.Cluster,
		"cluster",
		0,
		"cluster ID of Porter cluster",
	)

	utils.DefaultFlagSet.StringVar(
		&config.Token,
		"token",
		"",
		"token for Porter authentication",
	)

	utils.RegistryFlagSet.UintVar(
		&config.Registry,
		"registry",
		0,
		"registry ID of connected Porter registry",
	)

	utils.HelmRepoFlagSet.UintVar(
		&config.HelmRepo,
		"helmrepo",
		0,
		"helm repo ID of connected Porter Helm repository",
	)
}

func GetCLIConfig() *CLIConfig {
	if config == nil {
		panic("GetCLIConfig() called before initialisation")
	}

	return config
}

func GetAPIClient() *api.Client {
	config := GetCLIConfig()

	if token := config.Token; token != "" {
		return api.NewClientWithToken(config.Host+"/api", token)
	}

	return api.NewClient(config.Host+"/api", "cookie.json")
}

func (c *CLIConfig) SetDriver(driver string) error {
	viper.Set("driver", driver)
	color.New(color.FgGreen).Printf("Set the current driver as %s\n", driver)
	err := viper.WriteConfig()

	if err != nil {
		return err
	}

	config.Driver = driver

	return nil
}

func (c *CLIConfig) SetHost(host string) error {
	// a trailing / can lead to errors with the api server
	host = strings.TrimRight(host, "/")

	viper.Set("host", host)
	color.New(color.FgGreen).Printf("Set the current host as %s\n", host)
	err := viper.WriteConfig()

	if err != nil {
		return err
	}

	config.Host = host

	return nil
}

func (c *CLIConfig) SetProject(projectID uint) error {
	if config.Kubeconfig != "" || viper.IsSet("kubeconfig") {
		viper.Set("kubeconfig", "")
		color.New(color.FgBlue).Println("Removing local kubeconfig")
		config.Kubeconfig = ""
	}

	viper.Set("project", projectID)
	color.New(color.FgGreen).Printf("Set the current project as %d\n", projectID)
	err := viper.WriteConfig()

	if err != nil {
		return err
	}

	config.Project = projectID

	return nil
}

func (c *CLIConfig) SetCluster(clusterID uint) error {
	if config.Kubeconfig != "" || viper.IsSet("kubeconfig") {
		viper.Set("kubeconfig", "")
		color.New(color.FgBlue).Println("Removing local kubeconfig")
		config.Kubeconfig = ""
	}

	viper.Set("cluster", clusterID)
	color.New(color.FgGreen).Printf("Set the current cluster as %d\n", clusterID)
	err := viper.WriteConfig()

	if err != nil {
		return err
	}

	config.Cluster = clusterID

	return nil
}

func (c *CLIConfig) SetToken(token string) error {
	viper.Set("token", token)
	err := viper.WriteConfig()

	if err != nil {
		return err
	}

	config.Token = token

	return nil
}

func (c *CLIConfig) SetRegistry(registryID uint) error {
	viper.Set("registry", registryID)
	color.New(color.FgGreen).Printf("Set the current registry as %d\n", registryID)
	err := viper.WriteConfig()

	if err != nil {
		return err
	}

	config.Registry = registryID

	return nil
}

func (c *CLIConfig) SetHelmRepo(helmRepoID uint) error {
	viper.Set("helm_repo", helmRepoID)
	color.New(color.FgGreen).Printf("Set the current Helm repo as %d\n", helmRepoID)
	err := viper.WriteConfig()

	if err != nil {
		return err
	}

	config.HelmRepo = helmRepoID

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

	viper.Set("kubeconfig", kubeconfig)
	color.New(color.FgGreen).Printf("Set the path to kubeconfig as %s\n", kubeconfig)
	err = viper.WriteConfig()

	if err != nil {
		return err
	}

	config.Kubeconfig = kubeconfig

	return nil
}
