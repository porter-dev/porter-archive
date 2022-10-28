package v2

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	apiTypes "github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	parser "github.com/porter-dev/switchboard/v2/pkg/parser"
	types "github.com/porter-dev/switchboard/v2/pkg/types"
	validator "github.com/porter-dev/switchboard/v2/pkg/validator"
	"github.com/porter-dev/switchboard/v2/pkg/worker"
)

const (
	constantsEnvGroup = "preview-env-constants"

	defaultCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~`!@#$%^&*()_+-={}[]"
)

type PreviewApplier struct {
	apiClient *api.Client
	rawBytes  []byte
	namespace string
	parsed    *types.ParsedPorterYAML

	variablesMap map[string]string
	osEnv        map[string]string
	envGroups    map[string]*apiTypes.EnvGroup
}

func NewApplier(client *api.Client, raw []byte, namespace string) (*PreviewApplier, error) {
	parsed, err := parser.ParseRawBytes(raw)

	if err != nil {
		return nil, err
	}

	err = validator.ValidatePorterYAML(parsed)

	if err != nil {
		return nil, err
	}

	return &PreviewApplier{
		apiClient: client,
		rawBytes:  raw,
		namespace: namespace,
		parsed:    parsed,
	}, nil
}

func (a *PreviewApplier) Apply() error {
	// check if the namespace exists in the current project-cluster pair
	//
	// this is a sanity check to ensure that the user does not see any internal
	// errors that are caused by the namespace not existing
	nsList, err := a.apiClient.GetK8sNamespaces(
		context.Background(),
		config.GetCLIConfig().Project,
		config.GetCLIConfig().Cluster,
	)

	if err != nil {
		return fmt.Errorf("error listing namespaces for project '%d', cluster '%d': %w",
			config.GetCLIConfig().Project, config.GetCLIConfig().Cluster, err)
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
		return fmt.Errorf("namespace '%s' does not exist in project '%d', cluster '%d'",
			a.namespace, config.GetCLIConfig().Project, config.GetCLIConfig().Cluster)
	}

	color.New(color.FgBlue).Printf("[porter.yaml v2] Applying preview environments with the following attributes:\n"+
		"\tHost: %s\n\tProject ID: %d\n\tCluster ID: %d\n\tNamespace: %s\n",
		config.GetCLIConfig().Host,
		config.GetCLIConfig().Project,
		config.GetCLIConfig().Cluster,
		a.namespace,
	) // FIXME: use a scoped logger

	// err := a.readOSEnv()

	// if err != nil {
	// 	return err
	// }

	// err = a.processVariables()

	// if err != nil {
	// 	return err
	// }

	// err = a.processEnvGroups()

	// if err != nil {
	// 	return err
	// }

	w := worker.NewWorker()
	w.RegisterDriver("default", &DefaultDriver{
		Vars:      a.variablesMap,
		Env:       a.osEnv,
		APIClient: a.apiClient,
		Namespace: a.namespace,
	})
	w.SetDefaultDriver("default")

	return w.Apply(a.parsed.PorterYAML)
}

func (a *PreviewApplier) readOSEnv() error {
	color.New(color.FgBlue).Println("[porter.yaml v2] Reading OS environment variables") // FIXME: use a scoped logger

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
				color.New(color.FgYellow).Printf("[porter.yaml v2] Ignoring invalid OS environment variable '%s'\n", kCopy) // FIXME: use a scoped logger
			}

			osEnv[k] = v
		}
	}

	a.osEnv = osEnv

	return nil
}

func (a *PreviewApplier) processEnvGroups() error {
	color.New(color.FgBlue).Println("[porter.yaml v2] Processing env groups") // FIXME: use a scoped logger

	for _, eg := range a.parsed.PorterYAML.EnvGroups.GetValue() {
		envGroup, err := a.apiClient.GetEnvGroup(
			context.Background(),
			config.GetCLIConfig().Project,
			config.GetCLIConfig().Cluster,
			a.namespace,
			&apiTypes.GetEnvGroupRequest{
				Name: eg.Name.GetValue(),
			},
		)

		if err != nil && strings.Contains(err.Error(), "env group not found") {
			cloneFrom := strings.Split(eg.CloneFrom.GetValue(), "/")

			if len(cloneFrom) != 2 {
				// this should not happen
				return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
					"error:\n-----\nERROR: invalid env group clone_from format: %s", eg.CloneFrom.GetValue())
			}

			// clone the env group
			envGroup, err := a.apiClient.CloneEnvGroup(
				context.Background(),
				config.GetCLIConfig().Project,
				config.GetCLIConfig().Cluster,
				cloneFrom[0],
				&apiTypes.CloneEnvGroupRequest{
					SourceName:      cloneFrom[1],
					TargetNamespace: a.namespace,
					TargetName:      eg.Name.GetValue(),
				},
			)

			if err != nil {
				return fmt.Errorf("error cloning env group '%s' from '%s': %w", eg.Name.GetValue(),
					eg.CloneFrom.GetValue(), err)
			}

			a.envGroups[eg.Name.GetValue()] = &apiTypes.EnvGroup{
				Name:      envGroup.Name,
				Variables: envGroup.Variables,
			}
		} else if err != nil {
			return fmt.Errorf("error checking for env group '%s': %w", eg.Name.GetValue(), err)
		} else {
			a.envGroups[eg.Name.GetValue()] = &apiTypes.EnvGroup{
				Name:      envGroup.Name,
				Variables: envGroup.Variables,
			}
		}
	}

	return nil
}

func (a *PreviewApplier) processVariables() error {
	color.New(color.FgBlue).Println("[porter.yaml v2] Processing variables") // FIXME: use a scoped logger

	constantsMap := make(map[string]string)
	variablesMap := make(map[string]string)

	for _, v := range a.parsed.PorterYAML.Variables.GetValue() {
		if v.Once.GetValue() {
			// a constant which should be stored in the env group on first run
			if exists, err := a.constantExistsInEnvGroup(v.Name.GetValue()); err == nil {
				if exists == nil {
					// this should not happen
					return fmt.Errorf("internal error: please let the Porter team know about this and quote the following " +
						"error:\n-----\nERROR: checking for constant existence in env group returned nil with no error")
				}

				val := *exists

				if !val {
					// create the constant in the env group
					if v.Value.GetValue() != "" {
						constantsMap[v.Name.GetValue()] = v.Value.GetValue()
					} else if v.Random.GetValue() {
						constantsMap[v.Name.GetValue()] = randomString(v.Length.GetValue(), defaultCharset)
					} else {
						// this should not happen
						return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
							"error:\n-----\nERROR: for variable '%s', random is false and value is empty", v.Name.GetValue())
					}
				}
			} else {
				return fmt.Errorf("error checking for existence of constant %s: %w", v.Name.GetValue(), err)
			}
		} else {
			if v.Value.GetValue() != "" {
				variablesMap[v.Name.GetValue()] = v.Value.GetValue()
			} else if v.Random.GetValue() {
				variablesMap[v.Name.GetValue()] = randomString(v.Length.GetValue(), defaultCharset)
			} else {
				// this should not happen
				return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
					"error:\n-----\nERROR: for variable '%s', random is false and value is empty", v.Name.GetValue())
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
			return boolean(false), nil
		}

		return nil, err
	}

	if _, ok := apiResponse.Variables[name]; ok {
		return boolean(true), nil
	}

	return boolean(false), nil
}
