package types

const (
	URLParamInviteToken = "token"
)

type Invite struct {
	ID             uint   `json:"id"`
	Token          string `json:"token"`
	Expired        bool   `json:"expired"`
	Email          string `json:"email"`
	Accepted       bool   `json:"accepted"`
	Kind           string `json:"kind"`
	InvitingUserID uint   `json:"inviting_user_id"`
	Status         string `json:"status"`
}

type GetInviteResponse Invite

type CreateInviteRequest struct {
	Email string `json:"email,required"`
	Kind  string `json:"kind,required"`
}

type CreateInviteResponse struct {
	*Invite
}

type ListInvitesResponse []*Invite

type UpdateInviteRoleRequest struct {
	Kind string `json:"kind,required"`
}
