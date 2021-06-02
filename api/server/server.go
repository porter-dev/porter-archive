package server

import (
	"io"

	"github.com/porter-dev/porter/api/types"
)

type RequestReader func(r io.Reader, v interface{}) error

type ResponseWriter func(w io.Writer, v interface{}) error

type APIRequest struct {
	Metadata *types.APIRequestMetadata
	Reader   RequestReader
	Writer   ResponseWriter
}
