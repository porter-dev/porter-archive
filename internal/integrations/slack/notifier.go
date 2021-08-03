package slack

import (
	"bytes"
	"fmt"
	"net/http"
	"time"

	"github.com/porter-dev/porter/internal/models/integrations"
)

type Notifier interface {
	Notify(opts *NotifyOpts) error
}

type DeploymentStatus string

const (
	StatusDeployed string = "deployed"
	StatusFailed   string = "failed"
)

type NotifyOpts struct {
	// ProjectID is the id of the Porter project that this deployment belongs to
	ProjectID uint

	// ClusterID is the id of the Porter cluster that this deployment belongs to
	ClusterID uint

	// ClusterName is the name of the cluster that this deployment was deployed in
	ClusterName string

	// Status is the current status of the deployment.
	Status string

	// Info is any additional information about this status, such as an error message if
	// the deployment failed.
	Info string

	// Name is the name of the deployment that this notification refers to.
	Name string

	// Namespace is the Kubernetes namespace of the deployment that this notification refers to.
	Namespace string

	URL string

	Version int
}

type SlackNotifier struct {
	slackInts []*integrations.SlackIntegration
}

func NewSlackNotifier(slackInts ...*integrations.SlackIntegration) Notifier {
	return &SlackNotifier{
		slackInts: slackInts,
	}
}

func (s *SlackNotifier) Notify(opts *NotifyOpts) error {
	var statusPayload string

	switch opts.Status {
	case StatusDeployed:
		statusPayload = getSuccessPayload(opts)
	case StatusFailed:
		statusPayload = getFailedPayload(opts)
	}

	payload := fmt.Sprintf(`
	{
		"blocks": [
			%s
			{
				"type": "divider"
			},
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "*Name:* %s"
				}
			},
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "*Namespace:* %s"
				}
			},
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "*Version:* %d"
				}
			}
		]
	}
	`, statusPayload, "`"+opts.Name+"`", "`"+opts.Namespace+"`", opts.Version)

	reqBody := bytes.NewReader([]byte(payload))
	client := &http.Client{
		Timeout: time.Second * 5,
	}

	for _, slackInt := range s.slackInts {
		client.Post(string(slackInt.Webhook), "application/json", reqBody)
	}

	return nil
}

func getSuccessPayload(opts *NotifyOpts) string {
	return fmt.Sprintf(`
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":rocket: Your application %s was successfully updated on Porter! <%s|View the new release.>"
			}
		},
	`, "`"+opts.Name+"`", opts.URL)
}

func getFailedPayload(opts *NotifyOpts) string {
	return fmt.Sprintf(`
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":x: Your application %s failed to deploy on Porter. <%s|View the status here.>"
			}
		},
	`, "`"+opts.Name+"`", opts.URL)
}
