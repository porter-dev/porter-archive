package cmd

import (
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/fatih/color"
	"github.com/spf13/viper"

	flag "github.com/spf13/pflag"
)

// shared sets of flags used by multiple commands
var driverFlagSet = flag.NewFlagSet("driver", flag.ExitOnError)
var defaultFlagSet = flag.NewFlagSet("shared", flag.ExitOnError) // used by all commands
var registryFlagSet = flag.NewFlagSet("registry", flag.ExitOnError)
var helmRepoFlagSet = flag.NewFlagSet("helmrepo", flag.ExitOnError)

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

	Registry uint `yaml:"registry"`
	HelmRepo uint `yaml:"helm_repo"`
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
	viper.BindPFlags(driverFlagSet)
	viper.BindPFlags(defaultFlagSet)
	viper.BindPFlags(registryFlagSet)
	viper.BindPFlags(helmRepoFlagSet)

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
	driverFlagSet.StringVar(
		&config.Driver,
		"driver",
		"local",
		"driver to use (local or docker)",
	)

	defaultFlagSet.StringVar(
		&config.Host,
		"host",
		"https://dashboard.getporter.dev",
		"host URL of Porter instance",
	)

	defaultFlagSet.UintVar(
		&config.Project,
		"project",
		0,
		"project ID of Porter project",
	)

	defaultFlagSet.UintVar(
		&config.Cluster,
		"cluster",
		0,
		"cluster ID of Porter cluster",
	)

	defaultFlagSet.StringVar(
		&config.Token,
		"token",
		"",
		"token for Porter authentication",
	)

	registryFlagSet.UintVar(
		&config.Registry,
		"registry",
		0,
		"registry ID of connected Porter registry",
	)

	helmRepoFlagSet.UintVar(
		&config.HelmRepo,
		"helmrepo",
		0,
		"helm repo ID of connected Porter Helm repository",
	)
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

// var configCmd = &cobra.Command{
// 	Use:   "config",
// 	Short: "Commands that control local configuration settings",
// 	Run: func(cmd *cobra.Command, args []string) {
// 		if err := printConfig(); err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}
// 	},
// }

// var config.SetProjectCmd = &cobra.Command{
// 	Use:   "set-project [id]",
// 	Args:  cobra.ExactArgs(1),
// 	Short: "Saves the project id in the default configuration",
// 	Run: func(cmd *cobra.Command, args []string) {
// 		projID, err := strconv.ParseUint(args[0], 10, 64)

// 		if err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}

// 		err = config.SetProject(uint(projID))

// 		if err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}
// 	},
// }

// var config.SetClusterCmd = &cobra.Command{
// 	Use:   "set-cluster [id]",
// 	Args:  cobra.ExactArgs(1),
// 	Short: "Saves the cluster id in the default configuration",
// 	Run: func(cmd *cobra.Command, args []string) {
// 		clusterID, err := strconv.ParseUint(args[0], 10, 64)

// 		if err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}

// 		err = config.SetCluster(uint(clusterID))

// 		if err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}
// 	},
// }

// var setRegistryCmd = &cobra.Command{
// 	Use:   "set-registry [id]",
// 	Args:  cobra.ExactArgs(1),
// 	Short: "Saves the registry id in the default configuration",
// 	Run: func(cmd *cobra.Command, args []string) {
// 		registryID, err := strconv.ParseUint(args[0], 10, 64)

// 		if err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}

// 		err = setRegistry(uint(registryID))

// 		if err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}
// 	},
// }

// var setHelmRepoCmd = &cobra.Command{
// 	Use:   "set-helmrepo [id]",
// 	Args:  cobra.ExactArgs(1),
// 	Short: "Saves the helm repo id in the default configuration",
// 	Run: func(cmd *cobra.Command, args []string) {
// 		hrID, err := strconv.ParseUint(args[0], 10, 64)

// 		if err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}

// 		err = setHelmRepo(uint(hrID))

// 		if err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}
// 	},
// }

// var config.SetHostCmd = &cobra.Command{
// 	Use:   "set-host [host]",
// 	Args:  cobra.ExactArgs(1),
// 	Short: "Saves the host in the default configuration",
// 	Run: func(cmd *cobra.Command, args []string) {
// 		err := config.SetHost(args[0])

// 		if err != nil {
// 			color.New(color.FgRed).Printf("An error occurred: %v\n", err)
// 			os.Exit(1)
// 		}
// 	},
// }

// func init() {
// 	rootCmd.AddCommand(configCmd)

// 	configCmd.AddCommand(config.SetProjectCmd)
// 	configCmd.AddCommand(config.SetClusterCmd)
// 	configCmd.AddCommand(config.SetHostCmd)
// 	configCmd.AddCommand(setRegistryCmd)
// 	configCmd.AddCommand(setHelmRepoCmd)
// }

// func setDriver(driver string) error {
// 	viper.Set("driver", driver)
// 	err := viper.WriteConfig()
// 	color.New(color.FgGreen).Printf("Set the current driver as %s\n", driver)
// 	return err
// }

// func getDriver() string {
// 	if driver != "" {
// 		return driver
// 	}

// 	if opts.driver != "" {
// 		return opts.driver
// 	}

// 	return viper.GetString("driver")
// }

// func printConfig() error {
// 	config, err := ioutil.ReadFile(filepath.Join(home, ".porter", "porter.yaml"))

// 	if err != nil {
// 		return err
// 	}

// 	fmt.Printf(string(config))

// 	return nil
// }

// func config.SetProject(id uint) error {
// 	viper.Set("project", id)
// 	color.New(color.FgGreen).Printf("Set the current project id as %d\n", id)
// 	return viper.WriteConfig()
// }

// func config.SetCluster(id uint) error {
// 	viper.Set("cluster", id)
// 	color.New(color.FgGreen).Printf("Set the current cluster id as %d\n", id)
// 	return viper.WriteConfig()
// }

// func setRegistry(id uint) error {
// 	viper.Set("registry", id)
// 	color.New(color.FgGreen).Printf("Set the current registry id as %d\n", id)
// 	return viper.WriteConfig()
// }

// func setHelmRepo(id uint) error {
// 	viper.Set("helm_repo", id)
// 	color.New(color.FgGreen).Printf("Set the current helm repo id as %d\n", id)
// 	return viper.WriteConfig()
// }

// func config.SetHost(host string) error {
// 	viper.Set("host", host)
// 	err := viper.WriteConfig()
// 	color.New(color.FgGreen).Printf("Set the current host as %s\n", host)
// 	return err
// }

// func config.SetToken(token string) error {
// 	viper.Set("token", token)
// 	err := viper.WriteConfig()
// 	return err
// }

// func config.Host string {
// 	if host != "" {
// 		return host
// 	}

// 	return viper.GetString("host")
// }

// func config.Token string {
// 	return viper.GetString("token")
// }

// func config.Cluster() uint {
// 	if clusterID != 0 {
// 		return clusterID
// 	}

// 	return viper.GetUint("cluster")
// }

// func config.Registry uint {
// 	if registryID != 0 {
// 		return registryID
// 	}

// 	return viper.GetUint("registry")
// }

// func config.HelmRepo() uint {
// 	if helmRepoID != 0 {
// 		return helmRepoID
// 	}

// 	return viper.GetUint("helm_repo")
// }

// func config.Project uint {
// 	if projectID != 0 {
// 		return projectID
// 	}

// 	return viper.GetUint("project")
// }
