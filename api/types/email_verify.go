package types

type VerifyEmailFinalizeRequest struct {
	TokenID uint   `schema:"token_id" form:"required"`
	Token   string `schema:"token" form:"required"`
}
