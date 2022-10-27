package v2

import (
	"context"
	"fmt"

	"github.com/fatih/color"
	api "github.com/porter-dev/porter/api/client"
	apiTypes "github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/config"
	parser "github.com/porter-dev/switchboard/v2/pkg/parser"
	types "github.com/porter-dev/switchboard/v2/pkg/types"
	validator "github.com/porter-dev/switchboard/v2/pkg/validator"
)

const (
	contantsEnvGroup = "preview-env-constants"

	defaultCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~`!@#$%^&*()_+-={}[]"
)

type PreviewApplier struct {
	apiClient *api.Client
	rawBytes  []byte
	namespace string
	parsed    *types.ParsedPorterYAML
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
	err := a.processVariables()

	if err != nil {
		return err
	}

	return nil
}

func (a *PreviewApplier) processVariables() error {
	color.New(color.FgBlue).Println("[porter.yaml] Processing variables") // FIXME: use a scoped logger

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
				Name:      contantsEnvGroup,
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

	return nil
}

func (a *PreviewApplier) constantExistsInEnvGroup(name string) (*bool, error) {
	apiResponse, err := a.apiClient.GetEnvGroup(
		context.Background(),
		config.GetCLIConfig().Project,
		config.GetCLIConfig().Cluster,
		a.namespace,
		&apiTypes.GetEnvGroupRequest{
			Name: contantsEnvGroup,
			// we do not care about the version because it always needs to be the latest
		},
	)

	if err != nil {
		return nil, err
	}

	if _, ok := apiResponse.Variables[name]; ok {
		return boolean(true), nil
	}

	return boolean(false), nil
}
