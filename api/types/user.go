package types

type User struct {
	ID            uint   `json:"id"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
}

type CreateUserRequest struct {
	Email    string `json:"email" form:"required,max=255,email"`
	Password string `json:"password" form:"required,max=255"`
}

type CreateUserResponse User

type GetAuthenticatedUserResponse User

type LoginUserRequest struct {
	Email    string `json:"email" form:"required,max=255,email"`
	Password string `json:"password" form:"required,max=255"`
}

type LoginUserResponse User

type CLILoginUserRequest struct {
	Redirect string `schema:"redirect" form:"required"`
}

type CLILoginExchangeRequest struct {
	AuthorizationCode string `json:"authorization_code" form:"required"`
}

type CLILoginExchangeResponse struct {
	Token string `json:"token" form:"required"`
}

type InitiateResetUserPasswordRequest struct {
	Email string `json:"email" form:"required"`
}

type VerifyTokenFinalizeRequest struct {
	TokenID uint   `json:"token_id" schema:"token_id" form:"required"`
	Token   string `json:"token" schema:"token" form:"required"`
}

type VerifyEmailFinalizeRequest struct {
	VerifyTokenFinalizeRequest
}

type VerifyResetUserPasswordRequest struct {
	VerifyTokenFinalizeRequest

	Email string `json:"email" form:"required,max=255,email"`
}

type FinalizeResetUserPasswordRequest struct {
	VerifyResetUserPasswordRequest

	NewPassword string `json:"new_password" form:"required,max=255"`
}

type ListUserProjectsResponse []*Project

type WelcomeWebhookRequest struct {
	Email     string `json:"email" schema:"email"`
	IsCompany bool   `json:"isCompany" schema:"isCompany"`
	Company   string `json:"company" schema:"company"`
	Role      string `json:"role" schema:"role"`
	Name      string `json:"name" schema:"name"`
}
