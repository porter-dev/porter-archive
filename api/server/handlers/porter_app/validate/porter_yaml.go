package validate

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"

	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
	"gopkg.in/yaml.v2"
	"gorm.io/gorm"
)

type AppDefinition struct {
	Name             string `json:"name"`
	PorterYAMLBase64 string `json:"porter_yaml"`
}

func ValidatePorterYAML(file []byte, revisionRepo repository.RevisionRepository) ([]AppDefinition, error) {
	ctx, span := telemetry.NewSpan(context.Background(), "hydrate-porter-yaml")
	defer span.End()

	porterYaml := &PorterStackYAML{}
	validApps := make([]AppDefinition, 0)

	fmt.Println(string(file))

	err := yaml.Unmarshal(file, porterYaml)
	if err != nil {
		return validApps, telemetry.Error(ctx, span, err, "error unmarshaling porter yaml")
	}

	fmt.Printf("%+v\n", porterYaml)

	// get all apps as list
	apps, err := extractAppsFromPorterYaml(*porterYaml)
	fmt.Printf("apps: %+v\n", apps)
	if err != nil {
		fmt.Println("failing here")
		err = telemetry.Error(ctx, span, err, "error extracting apps from porter yaml")
		return validApps, err
	}

	// verify that at least one app is defined
	if len(apps) == 0 {
		fmt.Println("failing here")
		err = telemetry.Error(ctx, span, err, "no apps defined in porter yaml")
		return validApps, err
	}

	for name, app := range apps {
		previousYAML := PorterStackYAML{}
		latestRevision, err := revisionRepo.GetLatestRevision(name)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			err = telemetry.Error(ctx, span, err, "error getting latest revision")
			return validApps, err
		}

		previousApp := Application{}
		fmt.Printf("latest revision: %+v\n", latestRevision)
		if latestRevision != nil {
			decoded, err := base64.StdEncoding.DecodeString(latestRevision.PorterYAML)
			if err != nil {
				return validApps, telemetry.Error(ctx, span, err, "error decoding porter yaml from revision")
			}

			err = yaml.Unmarshal([]byte(decoded), previousYAML)
			if err != nil {
				return validApps, telemetry.Error(ctx, span, err, "error unmarshaling porter yaml from revision")
			}

			previousApp, err = castYamltoApp(previousYAML)
			if err != nil {
				return validApps, telemetry.Error(ctx, span, err, "error casting revision yaml to app")
			}
		}

		app, err = HydrateApplication(app, previousApp)
		if err != nil {
			return validApps, telemetry.Error(ctx, span, err, "error hydrating application")
		}

		finalYaml := PorterStackYAML{
			Name:     name,
			Services: app.Services,
			Build:    app.Build,
			Release:  app.Release,
			Env:      app.Env,
		}

		finalYamlBytes, err := yaml.Marshal(finalYaml)
		if err != nil {
			return validApps, telemetry.Error(ctx, span, err, "error marshaling final yaml")
		}

		finalYamlBase64 := base64.StdEncoding.EncodeToString(finalYamlBytes)

		validApps = append(validApps, AppDefinition{
			Name:             name,
			PorterYAMLBase64: finalYamlBase64,
		})
	}

	return validApps, nil
}

func castYamltoApp(porterYaml PorterStackYAML) (Application, error) {
	application := Application{}

	var services map[string]Service
	fmt.Printf("no apps or services defined in porter yaml: %+v\n", porterYaml.Services == nil && porterYaml.Apps == nil)
	if porterYaml.Services == nil && porterYaml.Apps == nil {
		return application, fmt.Errorf("no apps or services defined in porter yaml")
	}

	if porterYaml.Services != nil && porterYaml.Apps != nil {
		return application, fmt.Errorf("both apps and services defined in porter yaml")
	}

	if porterYaml.Apps != nil {
		services = porterYaml.Apps
	}

	if porterYaml.Services != nil {
		services = porterYaml.Services
	}

	application = Application{
		Env:      porterYaml.Env,
		Services: services,
		Build:    porterYaml.Build,
		Release:  porterYaml.Release,
	}

	return application, nil
}

func extractAppsFromPorterYaml(porterYaml PorterStackYAML) (map[string]Application, error) {
	ctx, span := telemetry.NewSpan(context.Background(), "extract-apps-from-porter-yaml")
	defer span.End()

	apps := make(map[string]Application)

	if porterYaml.Applications == nil {
		app, err := castYamltoApp(porterYaml)
		if err != nil {
			return nil, telemetry.Error(ctx, span, err, "error getting single app from porter yaml")
		}

		fmt.Printf("assigning app: %+v to %v\n", app, porterYaml.Name)
		apps[porterYaml.Name] = app

		return apps, nil
	}

	for name, app := range porterYaml.Applications {
		if app.Services == nil {
			return nil, telemetry.Error(ctx, span, nil, "no services defined for an app in porter yaml")
		}

		apps[name] = Application{
			Env:      app.Env,
			Services: app.Services,
			Build:    app.Build,
			Release:  app.Release,
		}
	}

	return apps, nil
}
