package handlers

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/internal/repository"
)

type PorterHandler interface {
	Config() *shared.Config
	Repo() repository.Repository
	HandleAPIError(w http.ResponseWriter, err apierrors.RequestError)
}

type PorterHandlerWriter interface {
	PorterHandler
	WriteResult(w http.ResponseWriter, v interface{})
}

type PorterHandlerReader interface {
	PorterHandler
	DecodeAndValidate(w http.ResponseWriter, r *http.Request, v interface{}) bool
}

type PorterHandlerReadWriter interface {
	PorterHandlerWriter
	PorterHandlerReader
}

type DefaultPorterHandler struct {
	config           *shared.Config
	decoderValidator shared.RequestDecoderValidator
	writer           shared.ResultWriter
}

func NewDefaultPorterHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) PorterHandlerReadWriter {
	return &DefaultPorterHandler{config, decoderValidator, writer}
}

func (d *DefaultPorterHandler) Config() *shared.Config {
	return d.config
}

func (d *DefaultPorterHandler) Repo() repository.Repository {
	return d.config.Repo
}

func (d *DefaultPorterHandler) HandleAPIError(w http.ResponseWriter, err apierrors.RequestError) {
	apierrors.HandleAPIError(w, d.Config().Logger, err)
}

func (d *DefaultPorterHandler) WriteResult(w http.ResponseWriter, v interface{}) {
	d.writer.WriteResult(w, v)
}

func (d *DefaultPorterHandler) DecodeAndValidate(w http.ResponseWriter, r *http.Request, v interface{}) bool {
	return d.decoderValidator.DecodeAndValidate(w, r, v)
}
