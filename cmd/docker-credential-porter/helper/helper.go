package helper

import (
	"context"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"

	"github.com/docker/docker-credential-helpers/credentials"
	"github.com/porter-dev/porter/cli/cmd"
	"github.com/porter-dev/porter/cli/cmd/api"
	"github.com/spf13/viper"
	"k8s.io/client-go/util/homedir"
)

// PorterHelper implements credentials.Helper: it acts as a credentials
// helper for Docker that allows authentication with different registries.
type PorterHelper struct{}

// Add appends credentials to the store.
func (p *PorterHelper) Add(cr *credentials.Credentials) error {
	// Doesn't seem to be called
	return nil
}

// Delete removes credentials from the store.
func (p *PorterHelper) Delete(serverURL string) error {
	// Doesn't seem to be called
	return nil
}

// Get retrieves credentials from the store.
// It returns username and secret as strings.
func (p *PorterHelper) Get(serverURL string) (user string, secret string, err error) {
	cmd.Setup()
	var home = homedir.HomeDir()
	file, _ := os.OpenFile(filepath.Join(home, ".porter", "logs.txt"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	log.SetOutput(file)

	host := viper.GetString("host")
	projID := viper.GetUint("project")

	client := api.NewClient(host+"/api", "cookie.json")

	// list registries
	reg, err := client.ListRegistries(context.Background(), projID)

	log.Println("called regs", reg, err)

	if err != nil {
		return "", "", err
	}

	log.Println(reg)

	return "", "", nil
}

// List returns the stored serverURLs and their associated usernames.
func (p *PorterHelper) List() (map[string]string, error) {
	var home = homedir.HomeDir()

	ioutil.WriteFile(filepath.Join(home, ".porter", "log.txt"), []byte("called list\n"), 0644)

	return nil, nil
}
