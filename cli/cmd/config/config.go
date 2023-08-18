package config

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/spf13/viper"
	"k8s.io/client-go/util/homedir"
)

var home = homedir.HomeDir()

// config is a shared object used by all commands
// var config = &CLIConfig{}

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
func InitAndLoadConfig() (CLIConfig, error) {
	return initAndLoadConfig()
}

func initAndLoadConfig() (CLIConfig, error) {
	var config CLIConfig

	porterDir, err := getOrCreatePorterDirectoryAndConfig()
	if err != nil {
		return config, fmt.Errorf("unable to get or create porter directory: %w", err)
	}
	viper.SetConfigName("porter")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(porterDir)

	utils.DriverFlagSet.StringVar(
		&config.Driver,
		"driver",
		"local",
		"driver to use (local or docker)",
	)
	viper.BindPFlags(utils.DriverFlagSet)

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
	viper.BindPFlags(utils.RegistryFlagSet)

	utils.HelmRepoFlagSet.UintVar(
		&config.HelmRepo,
		"helmrepo",
		0,
		"helm repo ID of connected Porter Helm repository",
	)
	viper.BindPFlags(utils.HelmRepoFlagSet)
	viper.BindPFlags(utils.DefaultFlagSet)

	viper.SetEnvPrefix("PORTER")
	viper.BindEnv("host")
	viper.BindEnv("project")
	viper.BindEnv("cluster")
	viper.BindEnv("token")

	err = createAndLoadPorterYaml(porterDir)
	if err != nil {
		return config, fmt.Errorf("unable to load porter config: %w", err)
	}

	err = viper.Unmarshal(&config)
	if err != nil {
		return config, fmt.Errorf("unable to unmarshal porter config: %w", err)
	}

	return config, nil
}

// getOrCreatePorterDirectoryAndConfig checks that the .porter folder exists; create if not
func getOrCreatePorterDirectoryAndConfig() (string, error) {
	porterDir := filepath.Join(home, ".porter")

	_, err := os.Stat(porterDir)
	if err != nil {
		if !os.IsNotExist(err) {
			return "", fmt.Errorf("error reading porter directory: %w", err)
		}
		err = os.Mkdir(porterDir, 0o700)
		if err != nil {
			return "", fmt.Errorf("error creating porter directory: %w", err)
		}
	}
	return porterDir, nil
}

// createAndLoadPorterYaml loads a porter.yaml config into Viper if it exists, or creates the file if it does not
func createAndLoadPorterYaml(porterDir string) error {
	err := viper.ReadInConfig()
	if err != nil {
		_, ok := err.(viper.ConfigFileNotFoundError)
		if !ok {
			return fmt.Errorf("unknown error reading ~/.porter/porter.yaml config: %w", err)
		}

		err := os.WriteFile(filepath.Join(porterDir, "porter.yaml"), []byte{}, 0o644)
		if err != nil {
			return fmt.Errorf("unable to create ~/.porter/porter.yaml config: %w", err)
		}
	}
	return nil
}

func GetCLIConfig() *CLIConfig {
	if config == nil {
		panic("GetCLIConfig() called before initialisation")
	}

	return config
}

// func GetAPIClient() api.Client {
// 	ctx := context.Background()

// 	config := GetCLIConfig()

// 	client := api.NewClientWithConfig(ctx, api.NewClientInput{
// 		BaseURL:        fmt.Sprintf("%s/api", config.Host),
// 		BearerToken:    config.Token,
// 		CookieFileName: "cookie.json",
// 	})

// 	return client
// }

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

	// let us clear the project ID, cluster ID, and token when we reset a host
	viper.Set("project", 0)
	viper.Set("cluster", 0)
	viper.Set("token", "")

	err := viper.WriteConfig()
	if err != nil {
		return err
	}

	color.New(color.FgGreen).Printf("Set the current host as %s\n", host)

	config.Host = host
	config.Project = 0
	config.Cluster = 0
	config.Token = ""

	return nil
}

func (c *CLIConfig) SetProject(projectID uint) error {
	viper.Set("project", projectID)

	color.New(color.FgGreen).Printf("Set the current project as %d\n", projectID)

	if config.Kubeconfig != "" || viper.IsSet("kubeconfig") {
		color.New(color.FgYellow).Println("Please change local kubeconfig if needed")
	}

	err := viper.WriteConfig()
	if err != nil {
		return err
	}

	config.Project = projectID

	client := GetAPIClient()
	if client != nil {
		resp, err := client.ListProjectClusters(context.Background(), projectID)
		if err == nil {
			clusters := *resp
			if len(clusters) == 1 {
				c.SetCluster(clusters[0].ID)
			}
		}
	}

	return nil
}

func (c *CLIConfig) SetCluster(clusterID uint) error {
	viper.Set("cluster", clusterID)

	color.New(color.FgGreen).Printf("Set the current cluster as %d\n", clusterID)

	if config.Kubeconfig != "" || viper.IsSet("kubeconfig") {
		color.New(color.FgYellow).Println("Please change local kubeconfig if needed")
	}

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

	viper.Set("kubeconfig", path)
	color.New(color.FgGreen).Printf("Set the path to kubeconfig as %s\n", path)
	err = viper.WriteConfig()

	if err != nil {
		return err
	}

	config.Kubeconfig = kubeconfig

	return nil
}

func ValidateCLIEnvironment() error {
	if GetCLIConfig().Token == "" {
		return fmt.Errorf("no auth token present, please run 'porter auth login' to authenticate")
	}

	if GetCLIConfig().Project == 0 {
		return fmt.Errorf("no project selected, please run 'porter config set-project' to select a project")
	}

	if GetCLIConfig().Cluster == 0 {
		return fmt.Errorf("no cluster selected, please run 'porter config set-cluster' to select a cluster")
	}

	return nil
}
