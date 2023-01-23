package types

type IDPType string

const (
	IDPTypeOkta IDPType = "okta"
)

type ValidateSAMLRequest struct {
	Email string `json:"email"`
}
