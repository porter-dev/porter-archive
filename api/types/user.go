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
