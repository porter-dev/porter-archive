package email

import (
	"os"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

type SendgridClient struct {
	APIKey            string
	PWResetTemplateID string
	SenderEmail       string
}

func (client *SendgridClient) SendPWResetEmail(url, email string) error {
	request := sendgrid.GetRequest(os.Getenv("SENDGRID_API_KEY"), "/v3/mail/send", "https://api.sendgrid.com")
	request.Method = "POST"

	sgMail := &mail.SGMailV3{
		Personalizations: []*mail.Personalization{
			{
				To: []*mail.Email{
					{
						Address: email,
					},
				},
				DynamicTemplateData: map[string]interface{}{
					"url":   url,
					"email": email,
				},
			},
		},
		From: &mail.Email{
			Address: client.SenderEmail,
			Name:    "Porter",
		},
		TemplateID: client.PWResetTemplateID,
	}

	request.Body = mail.GetRequestBody(sgMail)

	_, err := sendgrid.API(request)

	return err
}
