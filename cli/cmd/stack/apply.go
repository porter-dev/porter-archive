package stack

import (
	"context"
	"fmt"
	"regexp"

	api "github.com/porter-dev/porter/api/client"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/switchboard/pkg/types"
	"gopkg.in/yaml.v2"
)

type StackConf struct {
	apiClient *api.Client
	rawBytes  []byte
	namespace string
	parsed    *PorterYAML
}

func NewApplier(client *api.Client, raw []byte, namespace string) (*StackConf, error) {
	// replace all instances of ${{ porter.env.FOO }} with { .get-env.FOO }
	re := regexp.MustCompile(`\$\{\{\s*porter\.env\.(.*)\s*\}\}`)
	raw = re.ReplaceAll(raw, []byte("{.get-env.$1}"))

	parsed := &PorterYAML{}

	err := yaml.Unmarshal(raw, parsed)
	if err != nil {
		errMsg := composePreviewMessage("error parsing porter.yaml", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	// err = validator.ValidatePorterYAML(parsed)

	err = validateCLIEnvironment(namespace)

	if err != nil {
		errMsg := composePreviewMessage("porter CLI is not configured correctly", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	return &PreviewApplier{
		apiClient: client,
		rawBytes:  raw,
		namespace: namespace,
		parsed:    parsed,
	}, nil
}

func validateCLIEnvironment(namespace string) error {
	if config.GetCLIConfig().Token == "" {
		return fmt.Errorf("no auth token present, please run 'porter auth login' to authenticate")
	}

	if config.GetCLIConfig().Project == 0 {
		return fmt.Errorf("no project selected, please run 'porter config set-project' to select a project")
	}

	if config.GetCLIConfig().Cluster == 0 {
		return fmt.Errorf("no cluster selected, please run 'porter config set-cluster' to select a cluster")
	}

	return nil
}

func Apply() error {
	// for v2beta1, check if the namespace exists in the current project-cluster pair
	//
	// this is a sanity check to ensure that the user does not see any internal
	// errors that are caused by the namespace not existing
	nsList, err := a.apiClient.GetK8sNamespaces(
		context.Background(),
		config.GetCLIConfig().Project,
		config.GetCLIConfig().Cluster,
	)
	if err != nil {
		errMsg := composePreviewMessage(fmt.Sprintf("error listing namespaces for project '%d', cluster '%d'",
			config.GetCLIConfig().Project, config.GetCLIConfig().Cluster), Error)
		return fmt.Errorf("%s: %w", errMsg, err)
	}

	namespaces := *nsList
	nsFound := false

	for _, ns := range namespaces {
		if ns.Name == a.namespace {
			nsFound = true
			break
		}
	}

	if !nsFound {
		// 	errMsg := composePreviewMessage(fmt.Sprintf("namespace '%s' does not exist in project '%d', cluster '%d'",
		// 		a.namespace, config.GetCLIConfig().Project, config.GetCLIConfig().Cluster), Error)
		// 	return fmt.Errorf("%s: %w", errMsg, err)
	}

	printInfoMessage(fmt.Sprintf("Applying porter.yaml with the following attributes:\n"+
		"\tHost: %s\n\tProject ID: %d\n\tCluster ID: %d\n\tNamespace: %s",
		config.GetCLIConfig().Host,
		config.GetCLIConfig().Project,
		config.GetCLIConfig().Cluster,
		a.namespace),
	)

	// err = a.readOSEnv()

	// if err != nil {
	// 	errMsg := composePreviewMessage("error reading OS environment variables", Error)
	// 	return fmt.Errorf("%s: %w", errMsg, err)
	// }

	// err = a.processVariables()

	// if err != nil {
	// 	return err
	// }

	// err = a.processEnvGroups()

	// if err != nil {
	// 	return err
	// }

	return nil
}

func DowngradeToV1() (*types.ResourceGroup, error) {
	err := a.Apply()
	if err != nil {
		return nil, err
	}

	v1File := &types.ResourceGroup{
		Version: "v1",
		Resources: []*types.Resource{
			{
				Name:   "get-env",
				Driver: "os-env",
			},
		},
	}

	buildRefs := make(map[string]*Build)

	for _, b := range a.parsed.Builds {
		if b == nil {
			continue
		}

		buildRefs[b.GetName()] = b

		bi, err := b.getV1BuildImage()
		if err != nil {
			return nil, err
		}

		pi, err := b.getV1PushImage()
		if err != nil {
			return nil, err
		}

		v1File.Resources = append(v1File.Resources, bi, pi)
	}

	for _, app := range a.parsed.Apps {
		if app == nil {
			continue
		}

		if _, ok := buildRefs[app.GetBuildRef()]; !ok {
			errMsg := composePreviewMessage(fmt.Sprintf("build_ref '%s' referenced by app '%s' does not exist",
				app.GetBuildRef(), app.GetName()), Error)
			return nil, fmt.Errorf("%s: %w", errMsg, err)
		}

		ai, err := app.getV1Resource(buildRefs[app.GetBuildRef()])
		if err != nil {
			return nil, err
		}

		v1File.Resources = append(v1File.Resources, ai)
	}

	for _, addon := range a.parsed.Addons {
		if addon == nil {
			continue
		}

		ai, err := addon.getV1Addon()
		if err != nil {
			return nil, err
		}

		v1File.Resources = append(v1File.Resources, ai)
	}

	return v1File, nil
}
