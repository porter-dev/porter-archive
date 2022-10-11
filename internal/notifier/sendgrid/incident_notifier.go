package sendgrid

import (
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

type IncidentNotifier struct {
	opts *IncidentNotifierOpts
}

type IncidentNotifierOpts struct {
	*SharedOpts
	IncidentAlertTemplateID    string
	IncidentResolvedTemplateID string
	Users                      []*models.User
}

func NewIncidentNotifier(opts *IncidentNotifierOpts) notifier.IncidentNotifier {
	return &IncidentNotifier{opts}
}

func (s *IncidentNotifier) NotifyNew(incident *types.Incident, url string) error {
	request := sendgrid.GetRequest(s.opts.APIKey, "/v3/mail/send", "https://api.sendgrid.com")
	request.Method = "POST"

	addrs := make([]*mail.Email, 0)

	for _, user := range s.opts.Users {
		addrs = append(addrs, &mail.Email{
			Address: user.Email,
		})
	}

	sgMail := &mail.SGMailV3{
		Personalizations: []*mail.Personalization{
			{
				BCC: addrs,
				DynamicTemplateData: map[string]interface{}{
					"incident_text": incident.Summary,
					"app_url":       url,
					"subject":       fmt.Sprintf("Your application %s crashed on Porter", incident.ReleaseName),
					"preheader":     incident.Summary,
					"created_at":    fmt.Sprintf("%v", incident.CreatedAt),
				},
			},
		},
		From: &mail.Email{
			Address: s.opts.SenderEmail,
			Name:    "Porter Notifications",
		},
		TemplateID: s.opts.IncidentAlertTemplateID,
	}

	request.Body = mail.GetRequestBody(sgMail)

	_, err := sendgrid.API(request)

	return err
}

func (s *IncidentNotifier) NotifyResolved(incident *types.Incident, url string) error {
	request := sendgrid.GetRequest(s.opts.APIKey, "/v3/mail/send", "https://api.sendgrid.com")
	request.Method = "POST"

	addrs := make([]*mail.Email, 0)

	for _, user := range s.opts.Users {
		addrs = append(addrs, &mail.Email{
			Address: user.Email,
		})
	}

	sgMail := &mail.SGMailV3{
		Personalizations: []*mail.Personalization{
			{
				BCC: addrs,
				DynamicTemplateData: map[string]interface{}{
					"incident_resolved_text": fmt.Sprintf("[Resolved] The incident for application %s has been resolved. The incident text was:\n\n:%s", incident.ReleaseName, incident.Summary),
					"app_url":                url,
					"subject":                fmt.Sprintf("[Resolved] The incident for application %s has been resolved", incident.ReleaseName),
					"preheader":              incident.Summary,
					"resolved_at":            fmt.Sprintf("%v", incident.UpdatedAt),
				},
			},
		},
		From: &mail.Email{
			Address: s.opts.SenderEmail,
			Name:    "Porter Notifications",
		},
		TemplateID: s.opts.IncidentResolvedTemplateID,
	}

	request.Body = mail.GetRequestBody(sgMail)

	_, err := sendgrid.API(request)

	return err
}
