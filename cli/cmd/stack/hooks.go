package stack

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
)

type DeployAppHook struct {
	Client               *api.Client
	ApplicationName      string
	ProjectID, ClusterID uint
	BuildImageDriverName string
	PorterYAML           []byte
	Builder              string
	Namespace            string
	EnvironmentMeta      *EnvironmentMeta
}

func (t *DeployAppHook) PreApply() error {
	err := config.ValidateCLIEnvironment()
	if err != nil {
		errMsg := composePreviewMessage("porter CLI is not configured correctly", Error)
		return fmt.Errorf("%s: %w", errMsg, err)
	}
	return nil
}

func (t *DeployAppHook) DataQueries() map[string]interface{} {
	res := map[string]interface{}{
		"image": fmt.Sprintf("{$.%s.image}", t.BuildImageDriverName),
	}
	return res
}

// deploy the app
func (t *DeployAppHook) PostApply(driverOutput map[string]interface{}) error {
	client := config.GetAPIClient()

	_, err := client.GetRelease(
		context.Background(),
		t.ProjectID,
		t.ClusterID,
		t.Namespace,
		t.ApplicationName,
	)

	shouldCreate := err != nil

	if err != nil {
		color.New(color.FgYellow).Printf("Could not read release for app %s (%s): attempting creation\n", t.ApplicationName, err.Error())
	} else {
		color.New(color.FgGreen).Printf("Found release for app %s: attempting update\n", t.ApplicationName)
	}

	return t.applyApp(client, shouldCreate, driverOutput)
}

func (t *DeployAppHook) applyApp(client *api.Client, shouldCreate bool, driverOutput map[string]interface{}) error {
	var imageInfo types.ImageInfo
	image, ok := driverOutput["image"].(string)
	// if it contains a $, then it means the query didn't resolve to anything
	if ok && !strings.Contains(image, "$") {
		imageSpl := strings.Split(image, ":")
		if len(imageSpl) == 2 {
			imageInfo = types.ImageInfo{
				Repository: imageSpl[0],
				Tag:        imageSpl[1],
			}
		} else {
			return fmt.Errorf("could not parse image info %s", image)
		}
	}

	req := &types.CreatePorterAppRequest{
		ClusterID:        t.ClusterID,
		ProjectID:        t.ProjectID,
		PorterYAMLBase64: base64.StdEncoding.EncodeToString(t.PorterYAML),
		ImageInfo:        imageInfo,
		OverrideRelease:  false, // deploying from the cli will never delete release resources, only append or override
		Builder:          t.Builder,
		Namespace:        t.Namespace,
	}

	_, err := client.CreatePorterApp(
		context.Background(),
		t.ProjectID,
		t.ClusterID,
		t.ApplicationName,
		req,
	)

	if err != nil {
		if shouldCreate {
			return fmt.Errorf("error creating app %s: %w", t.ApplicationName, err)
		}
		return fmt.Errorf("error updating app %s: %w", t.ApplicationName, err)
	}

	if t.EnvironmentMeta != nil {
		// create preview env record

	}

	return nil
}

func (t *DeployAppHook) OnConsolidatedErrors(map[string]error) {}
func (t *DeployAppHook) OnError(error)                         {}
