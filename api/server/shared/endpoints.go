package shared

import (
	"github.com/porter-dev/porter/api/server/requestutils"
	"github.com/porter-dev/porter/api/types"
)

type APIEndpoint struct {
	Metadata         *types.APIRequestMetadata
	DecoderValidator RequestDecoderValidator
	Writer           ResultWriter
}

type APIEndpointFactory interface {
	NewAPIEndpoint(metadata *types.APIRequestMetadata) *APIEndpoint
}

type APIObjectEndpointFactory struct {
	decoderValidator RequestDecoderValidator
	resultWriter     ResultWriter
}

func NewAPIObjectEndpointFactory(config *Config) APIEndpointFactory {
	validator := requestutils.NewDefaultValidator()
	decoder := requestutils.NewDefaultDecoder()

	decoderValidator := NewDefaultRequestDecoderValidator(config, validator, decoder)
	resultWriter := NewDefaultResultWriter(config)

	return &APIObjectEndpointFactory{
		decoderValidator: decoderValidator,
		resultWriter:     resultWriter,
	}
}

func (factory *APIObjectEndpointFactory) NewAPIEndpoint(
	metadata *types.APIRequestMetadata,
) *APIEndpoint {
	return &APIEndpoint{
		Metadata:         metadata,
		DecoderValidator: factory.decoderValidator,
		Writer:           factory.resultWriter,
	}
}
