package porter_app

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
	BuildEventID         string
}

func (t *DeployAppHook) PreApply() error {
	err := config.ValidateCLIEnvironment()
	if err != nil {
		errMsg := composePreviewMessage("porter CLI is not configured correctly", Error)
		return fmt.Errorf("%s: %w", errMsg, err)
	}

	buildEventId, err := createAppEvent(t.Client, t.ApplicationName, t.ProjectID, t.ClusterID)
	if err != nil {
		return err
	}
	t.BuildEventID = buildEventId

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
	namespace := fmt.Sprintf("porter-stack-%s", t.ApplicationName)

	_, err := t.Client.GetRelease(
		context.Background(),
		t.ProjectID,
		t.ClusterID,
		namespace,
		t.ApplicationName,
	)

	shouldCreate := err != nil

	if err != nil {
		color.New(color.FgYellow).Printf("Could not read release for app %s (%s): attempting creation\n", t.ApplicationName, err.Error())
	} else {
		color.New(color.FgGreen).Printf("Found release for app %s: attempting update\n", t.ApplicationName)
	}

	err = t.createOrUpdateApplication(shouldCreate, driverOutput)
	if err != nil {
		return err
	}
	eventRequest := types.CreateOrUpdatePorterAppEventRequest{
		Status:   "SUCCESS",
		Type:     types.PorterAppEventType_Build,
		Metadata: map[string]any{},
		ID:       t.BuildEventID,
	}
	_, _ = t.Client.CreateOrUpdatePorterAppEvent(context.Background(), t.ProjectID, t.ClusterID, t.ApplicationName, &eventRequest)

	return nil
}

func (t *DeployAppHook) createOrUpdateApplication(shouldCreate bool, driverOutput map[string]interface{}) error {
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

	_, err := t.Client.CreatePorterApp(
		context.Background(),
		t.ProjectID,
		t.ClusterID,
		t.ApplicationName,
		&types.CreatePorterAppRequest{
			ClusterID:        t.ClusterID,
			ProjectID:        t.ProjectID,
			PorterYAMLBase64: base64.StdEncoding.EncodeToString(t.PorterYAML),
			ImageInfo:        imageInfo,
			OverrideRelease:  false, // deploying from the cli will never delete release resources, only append or override
			Builder:          t.Builder,
		},
	)
	if err != nil {
		if shouldCreate {
			return fmt.Errorf("error creating app %s: %w", t.ApplicationName, err)
		}
		return fmt.Errorf("error updating app %s: %w", t.ApplicationName, err)
	}

	return nil
}

func (t *DeployAppHook) OnConsolidatedErrors(errors map[string]error) {
	errorStringMap := make(map[string]string)
	for k, v := range errors {
		errorStringMap[k] = fmt.Sprintf("%+v", v)
	}
	eventRequest := types.CreateOrUpdatePorterAppEventRequest{
		Status: "FAILED",
		Type:   types.PorterAppEventType_Build,
		Metadata: map[string]any{
			"errors": errorStringMap,
		},
		ID: t.BuildEventID,
	}
	_, _ = t.Client.CreateOrUpdatePorterAppEvent(context.Background(), t.ProjectID, t.ClusterID, t.ApplicationName, &eventRequest)
}

func (t *DeployAppHook) OnError(err error) {
	t.OnConsolidatedErrors(map[string]error{
		"pre-apply": err,
	})
}
