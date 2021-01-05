package cmd

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/fatih/color"
	"github.com/spf13/cobra"

	"github.com/docker/cli/cli/config/configfile"
)

var dockerCmd = &cobra.Command{
	Use:   "docker",
	Short: "Commands to configure Docker for a project",
}

var configureCmd = &cobra.Command{
	Use:   "configure",
	Short: "Configures the host's Docker instance",
	Run: func(cmd *cobra.Command, args []string) {
		if err := dockerConfig(); err != nil {
			color.New(color.FgRed).Println("Configuring Docker unsuccessful:", err.Error())
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(dockerCmd)

	dockerCmd.AddCommand(configureCmd)
}

func dockerConfig() error {
	dockerConfigFile := filepath.Join(home, ".docker", "config.json")

	// check that a compatible version of docker is installed

	// determine if configfile exists

	// if it does not exist, create it

	// if it does exist, read it
	configBytes, err := ioutil.ReadFile(dockerConfigFile)

	if err != nil {
		return err
	}

	config := &configfile.ConfigFile{
		Filename: dockerConfigFile,
	}

	err = json.Unmarshal(configBytes, config)

	if err != nil {
		return err
	}

	config.CredentialHelpers["393629051022.dkr.ecr.us-east-2.amazonaws.com"] = "porter"

	err = config.Save()

	if err != nil {
		return err
	}

	return nil

	// z := &github.ZIPReleaseGetter{
	// 	AssetName:           "docker-credential-porter",
	// 	AssetFolderDest:     "/usr/local/bin",
	// 	ZipFolderDest:       filepath.Join(home, ".porter"),
	// 	ZipName:             "docker-credential-porter_latest.zip",
	// 	EntityID:            "porter-dev",
	// 	RepoName:            "porter",
	// 	IsPlatformDependent: true,
	// }

	// err = z.GetLatestRelease()

	// if err != nil {
	// 	return err
	// }

	// return nil
}
