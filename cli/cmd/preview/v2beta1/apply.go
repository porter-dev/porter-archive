package v2beta1

import (
	"context"
	"fmt"
	"os"
	"strings"

	api "github.com/porter-dev/porter/api/client"
	apiTypes "github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	"github.com/porter-dev/switchboard/pkg/worker"
	"gopkg.in/yaml.v3"
)

const (
	constantsEnvGroup = "preview-env-constants"

	defaultCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~`!@#$%^&*()_+-={}[]"
)

type PreviewApplier struct {
	apiClient *api.Client
	rawBytes  []byte
	namespace string
	parsed    *PorterYAML

	variablesMap map[string]string
	osEnv        map[string]string
	envGroups    map[string]*apiTypes.EnvGroup
}

func NewApplier(client *api.Client, raw []byte, namespace string) (*PreviewApplier, error) {
	parsed := &PorterYAML{}

	err := yaml.Unmarshal(raw, parsed)

	if err != nil {
		errMsg := composePreviewMessage("error parsing porter.yaml", Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	// err = validator.ValidatePorterYAML(parsed)

	// if err != nil {
	// 	return nil, err
	// }

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

	if namespace == "" {
		return fmt.Errorf("no namespace provided, please set the PORTER_NAMESPACE environment variable")
	}

	return nil
}

func (a *PreviewApplier) Apply() error {
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
		errMsg := composePreviewMessage(fmt.Sprintf("namespace '%s' does not exist in project '%d', cluster '%d'",
			a.namespace, config.GetCLIConfig().Project, config.GetCLIConfig().Cluster), Error)
		return fmt.Errorf("%s: %w", errMsg, err)
	}

	printInfoMessage(fmt.Sprintf("Applying porter.yaml with the following attributes:\n"+
		"\tHost: %s\n\tProject ID: %d\n\tCluster ID: %d\n\tNamespace: %s",
		config.GetCLIConfig().Host,
		config.GetCLIConfig().Project,
		config.GetCLIConfig().Cluster,
		a.namespace),
	)

	err = a.readOSEnv()

	if err != nil {
		errMsg := composePreviewMessage("error reading OS environment variables", Error)
		return fmt.Errorf("%s: %w", errMsg, err)
	}

	err = a.processVariables()

	if err != nil {
		return err
	}

	err = a.processEnvGroups()

	if err != nil {
		return err
	}

	w := worker.NewWorker()
	w.RegisterDriver("default", &DefaultDriver{
		Vars:      a.variablesMap,
		Env:       a.osEnv,
		APIClient: a.apiClient,
		Namespace: a.namespace,
	})
	w.SetDefaultDriver("default")

	return nil
}

func (a *PreviewApplier) readOSEnv() error {
	printInfoMessage("Reading OS environment variables")

	env := os.Environ()
	osEnv := make(map[string]string)

	for _, e := range env {
		k, v, _ := strings.Cut(e, "=")
		kCopy := k

		if k != "" && v != "" && strings.HasPrefix(k, "PORTER_APPLY_") {
			// we only read in env variables that start with PORTER_APPLY_
			for strings.HasPrefix(k, "PORTER_APPLY_") {
				k = strings.TrimPrefix(k, "PORTER_APPLY_")
			}

			if k == "" {
				printWarningMessage(fmt.Sprintf("Ignoring invalid OS environment variable '%s'", kCopy))
			}

			osEnv[k] = v
		}
	}

	a.osEnv = osEnv

	return nil
}

func (a *PreviewApplier) processVariables() error {
	printInfoMessage("Processing variables")

	constantsMap := make(map[string]string)
	variablesMap := make(map[string]string)

	for _, v := range a.parsed.Variables {
		if v == nil {
			continue
		}

		if v.Once != nil && *v.Once {
			// a constant which should be stored in the env group on first run
			if exists, err := a.constantExistsInEnvGroup(*v.Name); err == nil {
				if exists == nil {
					// this should not happen
					return fmt.Errorf("internal error: please let the Porter team know about this and quote the following " +
						"error:\n-----\nERROR: checking for constant existence in env group returned nil with no error")
				}

				val := *exists

				if !val {
					// create the constant in the env group
					if *v.Value != "" {
						constantsMap[*v.Name] = *v.Value
					} else if v.Random != nil && *v.Random {
						constantsMap[*v.Name] = randomString(*v.Length, defaultCharset)
					} else {
						// this should not happen
						return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
							"error:\n-----\nERROR: for variable '%s', random is false and value is empty", *v.Name)
					}
				}
			} else {
				return fmt.Errorf("error checking for existence of constant %s: %w", *v.Name, err)
			}
		} else {
			if v.Value != nil && *v.Value != "" {
				variablesMap[*v.Name] = *v.Value
			} else if v.Random != nil && *v.Random {
				variablesMap[*v.Name] = randomString(*v.Length, defaultCharset)
			} else {
				// this should not happen
				return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
					"error:\n-----\nERROR: for variable '%s', random is false and value is empty", *v.Name)
			}
		}
	}

	if len(constantsMap) > 0 {
		// we need to create these constants in the env group
		_, err := a.apiClient.CreateEnvGroup(
			context.Background(),
			config.GetCLIConfig().Project,
			config.GetCLIConfig().Cluster,
			a.namespace,
			&apiTypes.CreateEnvGroupRequest{
				Name:      constantsEnvGroup,
				Variables: constantsMap,
			},
		)

		if err != nil {
			return fmt.Errorf("error creating constants (variables with once set to true) in env group: %w", err)
		}

		for k, v := range constantsMap {
			variablesMap[k] = v
		}
	}

	a.variablesMap = variablesMap

	return nil
}

func (a *PreviewApplier) constantExistsInEnvGroup(name string) (*bool, error) {
	apiResponse, err := a.apiClient.GetEnvGroup(
		context.Background(),
		config.GetCLIConfig().Project,
		config.GetCLIConfig().Cluster,
		a.namespace,
		&apiTypes.GetEnvGroupRequest{
			Name: constantsEnvGroup,
			// we do not care about the version because it always needs to be the latest
		},
	)

	if err != nil {
		if strings.Contains(err.Error(), "env group not found") {
			return booleanptr(false), nil
		}

		return nil, err
	}

	if _, ok := apiResponse.Variables[name]; ok {
		return booleanptr(true), nil
	}

	return booleanptr(false), nil
}

func (a *PreviewApplier) processEnvGroups() error {
	printInfoMessage("Processing env groups")

	for _, eg := range a.parsed.EnvGroups {
		if eg == nil {
			continue
		}

		if eg.Name == nil || *eg.Name == "" {

		}

		envGroup, err := a.apiClient.GetEnvGroup(
			context.Background(),
			config.GetCLIConfig().Project,
			config.GetCLIConfig().Cluster,
			a.namespace,
			&apiTypes.GetEnvGroupRequest{
				Name: *eg.Name,
			},
		)

		if err != nil && strings.Contains(err.Error(), "env group not found") {
			if eg.CloneFrom == nil {
				return fmt.Errorf(composePreviewMessage(fmt.Sprintf("empty clone_from for env group '%s'", *eg.Name), Error))
			}

			egNS, egName, found := strings.Cut(*eg.CloneFrom, "/")

			if !found {
				return fmt.Errorf("error parsing clone_from for env group '%s': invalid format", *eg.Name)
			}

			// clone the env group
			envGroup, err := a.apiClient.CloneEnvGroup(
				context.Background(),
				config.GetCLIConfig().Project,
				config.GetCLIConfig().Cluster,
				egNS,
				&apiTypes.CloneEnvGroupRequest{
					SourceName:      egName,
					TargetNamespace: a.namespace,
					TargetName:      *eg.Name,
				},
			)

			if err != nil {
				return fmt.Errorf("error cloning env group '%s' from '%s': %w", egName, egNS, err)
			}

			a.envGroups[*eg.Name] = &apiTypes.EnvGroup{
				Name:      envGroup.Name,
				Variables: envGroup.Variables,
			}
		} else if err != nil {
			return fmt.Errorf("error checking for env group '%s': %w", *eg.Name, err)
		} else {
			a.envGroups[*eg.Name] = &apiTypes.EnvGroup{
				Name:      envGroup.Name,
				Variables: envGroup.Variables,
			}
		}
	}

	return nil
}
