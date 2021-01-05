package cmd

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/url"
	"os"
	"path/filepath"

	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/github"
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
		err := checkLoginAndRun(args, dockerConfig)

		if err != nil {
			os.Exit(1)
		}
	},
}

func init() {
	rootCmd.AddCommand(dockerCmd)

	dockerCmd.AddCommand(configureCmd)
}

func dockerConfig(user *api.AuthCheckResponse, client *api.Client, args []string) error {
	pID := getProjectID()

	// get all registries that should be added
	regToAdd := make([]string, 0)

	// get the list of namespaces
	registries, err := client.ListRegistries(
		context.Background(),
		pID,
	)

	if err != nil {
		return err
	}

	for _, registry := range registries {
		if registry.URL != "" {
			// strip the protocol
			regURL, err := url.Parse(registry.URL)

			if err != nil {
				continue
			}

			regToAdd = append(regToAdd, regURL.Host)
		}
	}

	dockerConfigFile := filepath.Join(home, ".docker", "config.json")

	// check that a compatible version of docker is installed

	// determine if configfile exists

	// if it does not exist, create it

	// if it does exist, read it
	configBytes, err := ioutil.ReadFile(dockerConfigFile)

	if err != nil {
		return err
	}

	// download the porter cred helper
	z := &github.ZIPReleaseGetter{
		AssetName:           "docker-credential-porter",
		AssetFolderDest:     "/usr/local/bin",
		ZipFolderDest:       filepath.Join(home, ".porter"),
		ZipName:             "docker-credential-porter_latest.zip",
		EntityID:            "porter-dev",
		RepoName:            "porter",
		IsPlatformDependent: true,
	}

	err = z.GetLatestRelease()

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

	for _, regURL := range regToAdd {
		config.CredentialHelpers[regURL] = "porter"
	}

	return config.Save()
}
