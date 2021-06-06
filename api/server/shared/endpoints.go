package shared

import (
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
)

type APIEndpoint struct {
	Metadata         *types.APIRequestMetadata
	DecoderValidator RequestDecoderValidator
	Writer           ResultWriter
}

type APIEndpointFactory interface {
	NewAPIEndpoint(metadata *types.APIRequestMetadata) *APIEndpoint
	GetDecoderValidator() RequestDecoderValidator
	GetResultWriter() ResultWriter
}

type APIObjectEndpointFactory struct {
	DecoderValidator RequestDecoderValidator
	ResultWriter     ResultWriter
}

func NewAPIObjectEndpointFactory(config *Config) APIEndpointFactory {
	validator := requestutils.NewDefaultValidator()
	decoder := requestutils.NewDefaultDecoder()

	decoderValidator := NewDefaultRequestDecoderValidator(config, validator, decoder)
	resultWriter := NewDefaultResultWriter(config)

	return &APIObjectEndpointFactory{
		DecoderValidator: decoderValidator,
		ResultWriter:     resultWriter,
	}
}

func (factory *APIObjectEndpointFactory) NewAPIEndpoint(
	metadata *types.APIRequestMetadata,
) *APIEndpoint {
	return &APIEndpoint{
		Metadata:         metadata,
		DecoderValidator: factory.DecoderValidator,
		Writer:           factory.ResultWriter,
	}
}

func (factory *APIObjectEndpointFactory) GetDecoderValidator() RequestDecoderValidator {
	return factory.DecoderValidator
}

func (factory *APIObjectEndpointFactory) GetResultWriter() ResultWriter {
	return factory.ResultWriter
}
