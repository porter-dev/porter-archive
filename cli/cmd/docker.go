package cmd

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/porter-dev/porter/cli/cmd/github"
	"github.com/spf13/cobra"

	"github.com/docker/cli/cli/config/configfile"
	"github.com/docker/cli/cli/config/types"
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

	// check if the docker credential helper exists
	if !commandExists("docker-credential-porter") {
		err := downloadCredMatchingRelease()

		if err != nil {
			color.New(color.FgRed).Println("Failed to download credential helper binary:", err.Error())
			os.Exit(1)
		}
	}

	// otherwise, check the version flag of the binary
	cmdVersionCred := exec.Command("docker-credential-porter", "--version")
	writer := &versionWriter{}
	cmdVersionCred.Stdout = writer

	err = cmdVersionCred.Run()

	if err != nil || writer.Version != Version {
		err := downloadCredMatchingRelease()

		if err != nil {
			color.New(color.FgRed).Println("Failed to download credential helper binary:", err.Error())
			os.Exit(1)
		}
	}

	config := &configfile.ConfigFile{
		Filename: dockerConfigFile,
	}

	err = json.Unmarshal(configBytes, config)

	if err != nil {
		return err
	}

	if config.CredentialHelpers == nil {
		config.CredentialHelpers = make(map[string]string)
	}

	for _, regURL := range regToAdd {
		// if this is a dockerhub registry, see if an auth config has already been generated
		// for index.docker.io
		if strings.Contains(regURL, "index.docker.io") {
			isAuthenticated := false

			for key, _ := range config.AuthConfigs {
				if key == "https://index.docker.io/v1/" {
					isAuthenticated = true
				}
			}

			if !isAuthenticated {
				// get a dockerhub token from the Porter API
				tokenResp, err := client.GetDockerhubAuthorizationToken(context.Background(), getProjectID())

				if err != nil {
					return err
				}

				decodedToken, err := base64.StdEncoding.DecodeString(tokenResp.Token)

				if err != nil {
					return fmt.Errorf("Invalid token: %v", err)
				}

				parts := strings.SplitN(string(decodedToken), ":", 2)

				if len(parts) < 2 {
					return fmt.Errorf("Invalid token: expected two parts, got %d", len(parts))
				}

				config.AuthConfigs["https://index.docker.io/v1/"] = types.AuthConfig{
					Auth:     tokenResp.Token,
					Username: parts[0],
					Password: parts[1],
				}

				// since we're using token-based auth, unset the credstore
				config.CredentialsStore = ""
			}
		} else {
			config.CredentialHelpers[regURL] = "porter"
		}
	}

	return config.Save()
}

func downloadCredMatchingRelease() error {
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

	return z.GetRelease(Version)
}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}
