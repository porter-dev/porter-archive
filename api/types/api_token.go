package types

import "time"

const URLParamTokenID URLParam = "api_token_id"

type APITokenMeta struct {
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`

	ID         string `json:"id"`
	PolicyName string `json:"policy_name"`
	PolicyUID  string `json:"policy_uid"`
	Name       string `json:"name"`
}

type APIToken struct {
	*APITokenMeta

	Policy []*PolicyDocument `json:"policy"`
	Token  string            `json:"token,omitempty"`
}

type CreateAPIToken struct {
	PolicyUID string    `json:"policy_uid" form:"required"`
	ExpiresAt time.Time `json:"expires_at"`
	Name      string    `json:"name" form:"required"`
}
