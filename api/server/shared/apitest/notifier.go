package apitest

import (
	"github.com/porter-dev/porter/internal/notifier"
)

// FakeUserNotifier just stores data about a single notification,
// without sending the data anywhere
type FakeUserNotifier struct {
	lastPWResetOpts  *notifier.SendPasswordResetEmailOpts
	lastGHResetOpts  *notifier.SendGithubRelinkEmailOpts
	lastEmailVerOpts *notifier.SendEmailVerificationOpts
	lastProjInvOpts  *notifier.SendProjectInviteEmailOpts
}

func NewFakeUserNotifier() notifier.UserNotifier {
	return &FakeUserNotifier{}
}

func (f *FakeUserNotifier) SendPasswordResetEmail(opts *notifier.SendPasswordResetEmailOpts) error {
	f.lastPWResetOpts = opts
	return nil
}

func (f *FakeUserNotifier) GetPasswordResetEmailLastOpts() *notifier.SendPasswordResetEmailOpts {
	return f.lastPWResetOpts
}

func (f *FakeUserNotifier) SendGithubRelinkEmail(opts *notifier.SendGithubRelinkEmailOpts) error {
	f.lastGHResetOpts = opts
	return nil
}

func (f *FakeUserNotifier) GetGithubRelinkEmailLastOpts() *notifier.SendGithubRelinkEmailOpts {
	return f.lastGHResetOpts
}

func (f *FakeUserNotifier) SendEmailVerification(opts *notifier.SendEmailVerificationOpts) error {
	f.lastEmailVerOpts = opts
	return nil
}

func (f *FakeUserNotifier) GetSendEmailVerificationLastOpts() *notifier.SendEmailVerificationOpts {
	return f.lastEmailVerOpts
}

func (f *FakeUserNotifier) SendProjectInviteEmail(opts *notifier.SendProjectInviteEmailOpts) error {
	f.lastProjInvOpts = opts
	return nil
}

func (f *FakeUserNotifier) GetSendProjectInviteEmailLastOpts() *notifier.SendProjectInviteEmailOpts {
	return f.lastProjInvOpts
}
