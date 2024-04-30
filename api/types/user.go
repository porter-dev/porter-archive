package types

type User struct {
	ID            uint   `json:"id"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	CompanyName   string `json:"company_name"`

	// ReferralCode is a unique code that can be shared to referr other users to Porter
	ReferralCode string `json:"referral_code"`
	// ReferralRewardClaimed indicates if the user has already received a credits reward
	// for referring users
	ReferralRewardClaimed bool `json:"referral_reward_received"`
}

type CreateUserRequest struct {
	Email          string `json:"email" form:"required,max=255,email"`
	Password       string `json:"password" form:"required,max=255"`
	FirstName      string `json:"first_name" form:"required,max=255"`
	LastName       string `json:"last_name" form:"required,max=255"`
	CompanyName    string `json:"company_name" form:"required,max=255"`
	ReferralMethod string `json:"referral_method" form:"max=255"`
	// ReferredBy is the referral code of the user who referred this user
	ReferredBy string `json:"referred_by_code" form:"max=255"`
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

// ListUserProjectsResponse type for api responses to GET /projects
type ListUserProjectsResponse []*ProjectList

type WelcomeWebhookRequest struct {
	Email     string `json:"email" schema:"email"`
	IsCompany bool   `json:"isCompany" schema:"isCompany"`
	Company   string `json:"company" schema:"company"`
	Role      string `json:"role" schema:"role"`
	Name      string `json:"name" schema:"name"`
}

type UpdateUserInfoRequest struct {
	FirstName   string `json:"first_name" form:"required,max=255"`
	LastName    string `json:"last_name" form:"required,max=255"`
	CompanyName string `json:"company_name" form:"required,max=255"`
}
