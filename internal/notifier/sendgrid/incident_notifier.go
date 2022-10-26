package sendgrid

import (
	"fmt"
	"strings"

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

	personalizations := make([]*mail.Personalization, 0)

	resourceKind := "application"

	if strings.ToLower(string(incident.InvolvedObjectKind)) == "job" {
		resourceKind = "job"
	}

	templData := map[string]interface{}{
		"incident_text": incident.Summary,
		"app_url":       url,
		"subject":       fmt.Sprintf("Your %s %s crashed on Porter", resourceKind, incident.ReleaseName),
		"preheader":     incident.Summary,
		"created_at":    fmt.Sprintf("%s", incident.CreatedAt.Format("Jan 2, 2006 at 3:04pm (MST)")),
	}

	for _, user := range s.opts.Users {
		personalizations = append(personalizations, &mail.Personalization{
			To: []*mail.Email{
				{
					Address: user.Email,
				},
			},
			DynamicTemplateData: templData,
		})
	}

	sgMail := &mail.SGMailV3{
		Personalizations: personalizations,
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

	personalizations := make([]*mail.Personalization, 0)

	templData := map[string]interface{}{
		"incident_resolved_text": fmt.Sprintf("[Resolved] The incident for application %s has been resolved. The incident text was:\n\n:%s", incident.ReleaseName, incident.Summary),
		"app_url":                url,
		"subject":                fmt.Sprintf("[Resolved] The incident for application %s has been resolved", incident.ReleaseName),
		"preheader":              incident.Summary,
		"resolved_at":            fmt.Sprintf("%s", incident.UpdatedAt.Format("Jan 2, 2006 at 3:04pm (MST)")),
	}

	for _, user := range s.opts.Users {
		personalizations = append(personalizations, &mail.Personalization{
			To: []*mail.Email{
				{
					Address: user.Email,
				},
			},
			DynamicTemplateData: templData,
		})
	}

	sgMail := &mail.SGMailV3{
		Personalizations: personalizations,
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
