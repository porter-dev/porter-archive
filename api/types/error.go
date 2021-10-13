package types

const (
	ErrCodeUnavailable uint = 601
)

type ExternalError struct {
	// Optional error code for well-known error types
	Code uint `json:"code,omitempty"`

	Error string `json:"error"`
}
