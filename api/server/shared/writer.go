package shared

import "net/http"

type ResultWriter interface {
	WriteResult(w http.ResponseWriter, v interface{})
}

// default generalizes response codes for common operations
// (http.StatusOK, http.StatusCreated, etc)
type DefaultResultWriter struct {
	config *Config
}

func NewDefaultResultWriter(config *Config) ResultWriter {
	return &DefaultResultWriter{config}
}

func (j *DefaultResultWriter) WriteResult(w http.ResponseWriter, v interface{}) {
	// TODO: unimplemented
	return
}
