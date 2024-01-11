package v2

import (
	"fmt"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
)

// Env is a list of env variable definitions
type Env []EnvVariableDefinition

// EnvVariableSource indicates how to set an env variable
type EnvVariableSource string

const (
	// EnvVariableSource_Value indicates that the env variable should be set to an explicitly provided value
	EnvVariableSource_Value EnvVariableSource = "value"
	// EnvVariableSource_FromApp indicates that the env variable should be set to a value from another app
	EnvVariableSource_FromApp EnvVariableSource = "app"
)

// EnvVariableDefinition is a struct containing information about how to set an env variable
type EnvVariableDefinition struct {
	Key     string
	Source  EnvVariableSource
	Value   EnvValueOptional
	FromApp EnvVariableFromAppOptional
}

// EnvValueOptional is a struct wrapping an optional string value to be set as an env variable
type EnvValueOptional struct {
	// Value is the actual value of the env variable
	Value string

	IsSet bool
}

// EnvValueFromApp indicates which value to pull from the app
type EnvValueFromApp string

const (
	// EnvValueFromApp_InternalDomain indicates that the internal domain should be pulled from the app
	EnvValueFromApp_InternalDomain EnvValueFromApp = "internal_domain"
	// EnvValueFromApp_PublicDomain indicates that the first found public domain should be pulled from the app
	EnvValueFromApp_PublicDomain EnvValueFromApp = "public_domain"
)

// EnvVariableFromApp is a struct containing information about how to set an env variable from another app
type EnvVariableFromApp struct {
	// AppName is the name of the app to pull the value from
	AppName string
	// Value indicates which value to pull from the app
	Value EnvValueFromApp
	// ServiceName is the name of the service to pull the value from, if applicable
	ServiceName string
}

// EnvVariableFromAppOptional is an optional value indicating how to resolve an env variable from another app
type EnvVariableFromAppOptional struct {
	Value EnvVariableFromApp

	IsSet bool
}

// UnmarshalYAML implements the yaml.Unmarshaler interface for Env in order to support both a list of env variables and a map of env variables
func (e *Env) UnmarshalYAML(unmarshal func(interface{}) error) error {
	var asList []EnvVariableDefinition
	if err := unmarshal(&asList); err == nil {
		*e = asList
		return nil
	}

	var asMap map[string]string
	if err := unmarshal(&asMap); err != nil {
		return err
	}

	for key, value := range asMap {
		*e = append(*e, EnvVariableDefinition{
			Key:    key,
			Source: EnvVariableSource_Value,
			Value: EnvValueOptional{
				Value: value,
				IsSet: true,
			},
		})
	}

	return nil
}

// MarshalYAML implements the yaml.Marshaler interface for Env in order to convert from the internal representation to the yaml representation
func (e Env) MarshalYAML() (interface{}, error) {
	var rawList []rawEnvVarDef

	for _, def := range e {
		switch def.Source {
		case EnvVariableSource_Value:
			rawList = append(rawList, rawEnvVarDef{
				Key:   def.Key,
				Value: def.Value.Value,
			})
		case EnvVariableSource_FromApp:
			rawList = append(rawList, rawEnvVarDef{
				Key: def.Key,
				From: rawEnvVariableReference{
					Source:      EnvVariableSource_FromApp,
					Name:        def.FromApp.Value.AppName,
					Value:       string(def.FromApp.Value.Value),
					ServiceName: def.FromApp.Value.ServiceName,
				},
			})
		}
	}

	return rawList, nil
}

// rawEnvVarDef is a struct used to unmarshal the yaml representation of an env variable
// this represents the structure of an env variable in the yaml file
type rawEnvVarDef struct {
	Key   string                  `yaml:"key"`
	Value string                  `yaml:"value,omitempty"`
	From  rawEnvVariableReference `yaml:"from,omitempty"`
}

// rawEnvVariableReference is a struct used to unmarshal the yaml representation of an env variable reference
type rawEnvVariableReference struct {
	// source for the value. right now only "app" is supported
	Source EnvVariableSource `yaml:"source,omitempty"`
	// name of the app to get the value from
	Name string `yaml:"name,omitempty"`
	// value to pull from the app, right now only public_domain or internal_domain are supported
	Value string `yaml:"value,omitempty"`
	// name of the source to get the value from. only set if source is "app"
	ServiceName string `yaml:"service,omitempty"`
}

// UnmarshalYAML implements the yaml.Unmarshaler interface for EnvVariableDefinition in order to support both a string value and a reference to another app
func (def *EnvVariableDefinition) UnmarshalYAML(unmarshal func(interface{}) error) error {
	var raw rawEnvVarDef
	if err := unmarshal(&raw); err != nil {
		return err
	}

	def.Key = raw.Key
	if raw.Value != "" {
		def.Source = EnvVariableSource_Value
		def.Value = EnvValueOptional{
			Value: raw.Value,
			IsSet: true,
		}
	}

	if !def.Value.IsSet {
		switch raw.From.Source {
		case EnvVariableSource_FromApp:
			def.Source = EnvVariableSource_FromApp

			value, err := fromAppValue(raw.From.Value)
			if err != nil {
				return err
			}

			def.FromApp = EnvVariableFromAppOptional{
				Value: EnvVariableFromApp{
					AppName:     raw.From.Name,
					Value:       value,
					ServiceName: raw.From.ServiceName,
				},
				IsSet: true,
			}
		default:
			return fmt.Errorf("invalid source %s for env variable", raw.From.Source)
		}
	}

	return nil
}

// EnvVarFromAppToProto converts an env variable from app to the proto representation
func EnvVarFromAppToProto(value EnvVariableFromApp) (*porterv1.EnvVariableFromApp, error) {
	variable := &porterv1.EnvVariableFromApp{
		AppName:     value.AppName,
		ServiceName: value.ServiceName,
	}

	switch value.Value {
	case EnvValueFromApp_InternalDomain:
		variable.Value = porterv1.EnvValueFromApp_ENV_VALUE_FROM_APP_INTERNAL_DOMAIN
	case EnvValueFromApp_PublicDomain:
		variable.Value = porterv1.EnvValueFromApp_ENV_VALUE_FROM_APP_PUBLIC_DOMAIN
	default:
		return nil, fmt.Errorf("invalid value %s for env variable from app", value.Value)
	}

	return variable, nil
}

// EnvVarFromAppFromProto converts a proto env variable from app to the internal representation
func EnvVarFromAppFromProto(value *porterv1.EnvVariableFromApp) (EnvVariableFromAppOptional, error) {
	variable := EnvVariableFromAppOptional{
		Value: EnvVariableFromApp{
			AppName:     value.AppName,
			ServiceName: value.ServiceName,
		},
		IsSet: true,
	}

	switch value.Value {
	case porterv1.EnvValueFromApp_ENV_VALUE_FROM_APP_INTERNAL_DOMAIN:
		variable.Value.Value = EnvValueFromApp_InternalDomain
	case porterv1.EnvValueFromApp_ENV_VALUE_FROM_APP_PUBLIC_DOMAIN:
		variable.Value.Value = EnvValueFromApp_PublicDomain
	default:
		return variable, fmt.Errorf("invalid value %s for env variable from app", value.Value)
	}

	return variable, nil
}

func fromAppValue(raw string) (EnvValueFromApp, error) {
	switch raw {
	case string(EnvValueFromApp_InternalDomain):
		return EnvValueFromApp_InternalDomain, nil
	case string(EnvValueFromApp_PublicDomain):
		return EnvValueFromApp_PublicDomain, nil
	default:
		return "", fmt.Errorf("invalid value %s for env variable from app", raw)
	}
}
