package v2

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"

	"github.com/fatih/color"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

// Apply implements the functionality of the `porter apply` command for validate apply v2 projects
func Apply(ctx context.Context, cliConf *config.CLIConfig, client *api.Client, porterYamlPath string) error {
	appProto := &porterv1.PorterApp{}

	if len(porterYamlPath) == 0 {
		return fmt.Errorf("porter yaml is empty")
	}

	porterYaml, err := os.ReadFile(filepath.Clean(porterYamlPath))
	if err != nil {
		return fmt.Errorf("could not read porter yaml file: %w", err)
	}

	b64YAML := base64.StdEncoding.EncodeToString(porterYaml)

	resp, err := client.ParseYAML(ctx, cliConf.Project, cliConf.Cluster, b64YAML)
	if err != nil {
		return fmt.Errorf("error calling parse yaml endpoint: %w", err)
	}

	if resp.B64AppProto == "" {
		return fmt.Errorf("b64 app proto is empty")
	}

	decoded, err := base64.StdEncoding.DecodeString(resp.B64AppProto)
	if err != nil {
		return fmt.Errorf("unable to decode b64 app: %w", err)
	}

	err = helpers.UnmarshalContractObject(decoded, appProto)
	if err != nil {
		return fmt.Errorf("unable to unmarshal app: %w", err)
	}

	color.New(color.FgGreen).Printf("Successfully parsed Porter YAML file %+v\n", appProto) // nolint:errcheck,gosec

	return nil
}
