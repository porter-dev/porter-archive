package v2

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/fatih/color"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
)

// Apply implements the functionality of the `porter apply` command for validate apply v2 projects
func Apply(ctx context.Context, cliConf *config.CLIConfig, client *api.Client, porterYamlPath string) error {
	if len(porterYamlPath) == 0 {
		return fmt.Errorf("porter yaml is empty")
	}

	porterYaml, err := os.ReadFile(filepath.Clean(porterYamlPath))
	if err != nil {
		return fmt.Errorf("could not read porter yaml file: %w", err)
	}

	b64YAML := base64.StdEncoding.EncodeToString(porterYaml)

	parseResp, err := client.ParseYAML(ctx, cliConf.Project, cliConf.Cluster, b64YAML)
	if err != nil {
		return fmt.Errorf("error calling parse yaml endpoint: %w", err)
	}

	if parseResp.B64AppProto == "" {
		return errors.New("b64 app proto is empty")
	}

	targetResp, err := client.DefaultDeploymentTarget(ctx, cliConf.Project, cliConf.Cluster)
	if err != nil {
		return fmt.Errorf("error calling default deployment target endpoint: %w", err)
	}

	if targetResp.DeploymentTargetID == "" {
		return errors.New("deployment target id is empty")
	}

	validateResp, err := client.ValidatePorterApp(ctx, cliConf.Project, cliConf.Cluster, parseResp.B64AppProto, targetResp.DeploymentTargetID)
	if err != nil {
		return fmt.Errorf("error calling validate endpoint: %w", err)
	}

	if validateResp.ValidatedBase64AppProto == "" {
		return errors.New("validated b64 app proto is empty")
	}

	applyResp, err := client.ApplyPorterApp(ctx, cliConf.Project, cliConf.Cluster, validateResp.ValidatedBase64AppProto, targetResp.DeploymentTargetID)
	if err != nil {
		return fmt.Errorf("error calling apply endpoint: %w", err)
	}

	if applyResp.AppRevisionId == "" {
		return errors.New("app revision id is empty")
	}
	if applyResp.CLIAction == porterv1.EnumCLIAction_ENUM_CLI_ACTION_UNSPECIFIED {
		return errors.New("cli action is unknown")
	}

	color.New(color.FgGreen).Printf("Successfully applied Porter YAML as revision %v, next action: %v\n", applyResp.AppRevisionId, applyResp.CLIAction) // nolint:errcheck,gosec

	return nil
}
