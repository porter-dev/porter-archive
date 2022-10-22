package sendgrid

import (
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

type UserNotifier struct {
	opts *UserNotifierOpts
}

type UserNotifierOpts struct {
	*SharedOpts
	PWResetTemplateID       string
	PWGHTemplateID          string
	VerifyEmailTemplateID   string
	ProjectInviteTemplateID string
}

func NewUserNotifier(opts *UserNotifierOpts) notifier.UserNotifier {
	return &UserNotifier{opts}
}

func (s *UserNotifier) SendPasswordResetEmail(opts *notifier.SendPasswordResetEmailOpts) error {
	request := sendgrid.GetRequest(s.opts.APIKey, "/v3/mail/send", "https://api.sendgrid.com")
	request.Method = "POST"

	sgMail := &mail.SGMailV3{
		Personalizations: []*mail.Personalization{
			{
				To: []*mail.Email{
					{
						Address: opts.Email,
					},
				},
				DynamicTemplateData: map[string]interface{}{
					"url":   opts.URL,
					"email": opts.Email,
				},
			},
		},
		From: &mail.Email{
			Address: s.opts.SenderEmail,
			Name:    "Porter",
		},
		TemplateID: s.opts.PWResetTemplateID,
	}

	request.Body = mail.GetRequestBody(sgMail)

	_, err := sendgrid.API(request)

	return err
}

func (s *UserNotifier) SendGithubRelinkEmail(opts *notifier.SendGithubRelinkEmailOpts) error {
	request := sendgrid.GetRequest(s.opts.APIKey, "/v3/mail/send", "https://api.sendgrid.com")
	request.Method = "POST"

	sgMail := &mail.SGMailV3{
		Personalizations: []*mail.Personalization{
			{
				To: []*mail.Email{
					{
						Address: opts.Email,
					},
				},
				DynamicTemplateData: map[string]interface{}{
					"url":   opts.URL,
					"email": opts.Email,
				},
			},
		},
		From: &mail.Email{
			Address: s.opts.SenderEmail,
			Name:    "Porter",
		},
		TemplateID: s.opts.PWGHTemplateID,
	}

	request.Body = mail.GetRequestBody(sgMail)

	_, err := sendgrid.API(request)

	return err
}

func (s *UserNotifier) SendEmailVerification(opts *notifier.SendEmailVerificationOpts) error {
	request := sendgrid.GetRequest(s.opts.APIKey, "/v3/mail/send", "https://api.sendgrid.com")
	request.Method = "POST"

	sgMail := &mail.SGMailV3{
		Personalizations: []*mail.Personalization{
			{
				To: []*mail.Email{
					{
						Address: opts.Email,
					},
				},
				DynamicTemplateData: map[string]interface{}{
					"url":   opts.URL,
					"email": opts.Email,
				},
			},
		},
		From: &mail.Email{
			Address: s.opts.SenderEmail,
			Name:    "Porter",
		},
		TemplateID: s.opts.VerifyEmailTemplateID,
	}

	request.Body = mail.GetRequestBody(sgMail)

	_, err := sendgrid.API(request)

	return err
}

func (s *UserNotifier) SendProjectInviteEmail(opts *notifier.SendProjectInviteEmailOpts) error {
	request := sendgrid.GetRequest(s.opts.APIKey, "/v3/mail/send", "https://api.sendgrid.com")
	request.Method = "POST"

	sgMail := &mail.SGMailV3{
		Personalizations: []*mail.Personalization{
			{
				To: []*mail.Email{
					{
						Address: opts.InviteeEmail,
					},
				},
				DynamicTemplateData: map[string]interface{}{
					"url":          opts.URL,
					"sender_email": opts.ProjectOwnerEmail,
					"project":      opts.Project,
				},
			},
		},
		From: &mail.Email{
			Address: s.opts.SenderEmail,
			Name:    "Porter",
		},
		TemplateID: s.opts.ProjectInviteTemplateID,
	}

	request.Body = mail.GetRequestBody(sgMail)

	_, err := sendgrid.API(request)

	return err
}
