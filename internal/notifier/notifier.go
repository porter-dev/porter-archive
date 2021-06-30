package notifier

type SendPasswordResetEmailOpts struct {
	Email string
	URL   string
}

type SendGithubRelinkEmailOpts struct {
	Email string
	URL   string
}

type SendEmailVerificationOpts struct {
	Email string
	URL   string
}

type SendProjectInviteEmailOpts struct {
	InviteeEmail      string
	URL               string
	Project           string
	ProjectOwnerEmail string
}

type UserNotifier interface {
	SendPasswordResetEmail(opts *SendPasswordResetEmailOpts) error
	SendGithubRelinkEmail(opts *SendGithubRelinkEmailOpts) error
	SendEmailVerification(opts *SendEmailVerificationOpts) error
	SendProjectInviteEmail(opts *SendProjectInviteEmailOpts) error
}
