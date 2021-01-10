package cmd

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/url"
	"os"
	"path/filepath"
	"strings"

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
			rURL := registry.URL

			if !strings.Contains(rURL, "http") {
				rURL = "http://" + rURL
			}

			// strip the protocol
			regURL, err := url.Parse(rURL)

			if err != nil {
				continue
			}

			regToAdd = append(regToAdd, regURL.Host)
		}
	}

	dockerConfigFile := filepath.Join(home, ".docker", "config.json")

	// determine if configfile exists
	if info, err := os.Stat(dockerConfigFile); info.IsDir() || os.IsNotExist(err) {
		// if it does not exist, create it
		err := ioutil.WriteFile(dockerConfigFile, []byte("{}"), 0700)

		if err != nil {
			return err
		}
	}

	// read the file bytes
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
