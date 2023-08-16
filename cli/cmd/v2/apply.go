package v2

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"

	"github.com/porter-dev/api-contracts/generated/go/helpers"

	"github.com/porter-dev/porter/cli/cmd/config"

	api "github.com/porter-dev/porter/api/client"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
)

// Apply implements the functionality of the `porter apply` command for validate apply v2 projects
func Apply(ctx context.Context, cliConf *config.CLIConfig, client *api.Client, porterYamlPath string) error {
	appProto := &porterv1.PorterApp{}

	if len(porterYamlPath) == 0 {
		return fmt.Errorf("porter yaml is empty")
	}

	porterYaml, err := os.ReadFile(porterYamlPath)
	if err != nil {
		return fmt.Errorf("could not read porter yaml file: %w", err)
	}

	b64YAML := base64.StdEncoding.EncodeToString(porterYaml)

	resp, err := client.ParseYAML(ctx, cliConf.Project, cliConf.Cluster, b64YAML)
	if err != nil {
		return fmt.Errorf("error calling parse yaml endpoint: %w", err)
	}

	if resp.Base64AppProto == "" {
		return fmt.Errorf("b64 app proto is empty")
	}

	decoded, err := base64.StdEncoding.DecodeString(resp.Base64AppProto)
	if err != nil {
		return fmt.Errorf("unable to decode base64 app: %w", err)
	}

	err = helpers.UnmarshalContractObject(decoded, appProto)
	if err != nil {
		return fmt.Errorf("unable to unmarshal app: %w", err)
	}

	fmt.Printf("Successfully parsed Porter YAML file %+v\n", appProto)

	return nil
}
