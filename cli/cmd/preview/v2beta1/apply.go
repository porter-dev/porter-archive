package v2beta1

import (
	"context"
	"fmt"
	"os"
	"strings"

	api "github.com/porter-dev/porter/api/client"
	apiTypes "github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
)

const (
	constantsEnvGroup = "preview-env-constants"

	defaultCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~`!@#$%^&*()_+-={}[]"
)

type PreviewApplier struct {
	apiClient *api.Client
	rawBytes  []byte
	namespace string
	// parsed    *types.ParsedPorterYAML

	variablesMap map[string]string
	osEnv        map[string]string
	envGroups    map[string]*apiTypes.EnvGroup
}

func NewApplier(client *api.Client, raw []byte, namespace string) (*PreviewApplier, error) {
	// parsed, err := parser.ParseRawBytes(raw)

	// if err != nil {
	// 	return nil, err
	// }

	// err = validator.ValidatePorterYAML(parsed)

	// if err != nil {
	// 	return nil, err
	// }

	err := validateCLIEnvironment(namespace)

	if err != nil {
		errMsg := ComposePreviewMessage(fmt.Sprintf("porter CLI is not configured correctly"), Error)
		return nil, fmt.Errorf("%s: %w", errMsg, err)
	}

	return &PreviewApplier{
		apiClient: client,
		rawBytes:  raw,
		namespace: namespace,
		// parsed:    parsed,
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
		errMsg := ComposePreviewMessage(fmt.Sprintf("error listing namespaces for project '%d', cluster '%d'",
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
		errMsg := ComposePreviewMessage(fmt.Sprintf("namespace '%s' does not exist in project '%d', cluster '%d'",
			a.namespace, config.GetCLIConfig().Project, config.GetCLIConfig().Cluster), Error)
		return fmt.Errorf("%s: %w", errMsg, err)
	}

	PrintInfoMessage(fmt.Sprintf("Applying porter.yaml with the following attributes:\n"+
		"\tHost: %s\n\tProject ID: %d\n\tCluster ID: %d\n\tNamespace: %s",
		config.GetCLIConfig().Host,
		config.GetCLIConfig().Project,
		config.GetCLIConfig().Cluster,
		a.namespace),
	)

	err = a.readOSEnv()

	if err != nil {
		errMsg := ComposePreviewMessage("error reading OS environment variables", Error)
		return fmt.Errorf("%s: %w", errMsg, err)
	}

	return nil
}

func (a *PreviewApplier) readOSEnv() error {
	PrintInfoMessage("Reading OS environment variables")

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
				PrintWarningMessage(fmt.Sprintf("Ignoring invalid OS environment variable '%s'", kCopy))
			}

			osEnv[k] = v
		}
	}

	a.osEnv = osEnv

	return nil
}

// func (a *PreviewApplier) processVariables() error {
// 	PrintInfoMessage("Processing variables")

// 	constantsMap := make(map[string]string)
// 	variablesMap := make(map[string]string)

// 	for _, v := range a.parsed.PorterYAML.Variables.GetValue() {
// 		if v.Once.GetValue() {
// 			// a constant which should be stored in the env group on first run
// 			if exists, err := a.constantExistsInEnvGroup(v.Name.GetValue()); err == nil {
// 				if exists == nil {
// 					// this should not happen
// 					return fmt.Errorf("internal error: please let the Porter team know about this and quote the following " +
// 						"error:\n-----\nERROR: checking for constant existence in env group returned nil with no error")
// 				}

// 				val := *exists

// 				if !val {
// 					// create the constant in the env group
// 					if v.Value.GetValue() != "" {
// 						constantsMap[v.Name.GetValue()] = v.Value.GetValue()
// 					} else if v.Random.GetValue() {
// 						constantsMap[v.Name.GetValue()] = randomString(v.Length.GetValue(), defaultCharset)
// 					} else {
// 						// this should not happen
// 						return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
// 							"error:\n-----\nERROR: for variable '%s', random is false and value is empty", v.Name.GetValue())
// 					}
// 				}
// 			} else {
// 				return fmt.Errorf("error checking for existence of constant %s: %w", v.Name.GetValue(), err)
// 			}
// 		} else {
// 			if v.Value.GetValue() != "" {
// 				variablesMap[v.Name.GetValue()] = v.Value.GetValue()
// 			} else if v.Random.GetValue() {
// 				variablesMap[v.Name.GetValue()] = randomString(v.Length.GetValue(), defaultCharset)
// 			} else {
// 				// this should not happen
// 				return fmt.Errorf("internal error: please let the Porter team know about this and quote the following "+
// 					"error:\n-----\nERROR: for variable '%s', random is false and value is empty", v.Name.GetValue())
// 			}
// 		}
// 	}

// 	if len(constantsMap) > 0 {
// 		// we need to create these constants in the env group
// 		_, err := a.apiClient.CreateEnvGroup(
// 			context.Background(),
// 			config.GetCLIConfig().Project,
// 			config.GetCLIConfig().Cluster,
// 			a.namespace,
// 			&apiTypes.CreateEnvGroupRequest{
// 				Name:      constantsEnvGroup,
// 				Variables: constantsMap,
// 			},
// 		)

// 		if err != nil {
// 			return fmt.Errorf("error creating constants (variables with once set to true) in env group: %w", err)
// 		}

// 		for k, v := range constantsMap {
// 			variablesMap[k] = v
// 		}
// 	}

// 	a.variablesMap = variablesMap

// 	return nil
// }

// func (a *PreviewApplier) constantExistsInEnvGroup(name string) (*bool, error) {
// 	apiResponse, err := a.apiClient.GetEnvGroup(
// 		context.Background(),
// 		config.GetCLIConfig().Project,
// 		config.GetCLIConfig().Cluster,
// 		a.namespace,
// 		&apiTypes.GetEnvGroupRequest{
// 			Name: constantsEnvGroup,
// 			// we do not care about the version because it always needs to be the latest
// 		},
// 	)

// 	if err != nil {
// 		if strings.Contains(err.Error(), "env group not found") {
// 			return boolean(false), nil
// 		}

// 		return nil, err
// 	}

// 	if _, ok := apiResponse.Variables[name]; ok {
// 		return boolean(true), nil
// 	}

// 	return boolean(false), nil
// }
