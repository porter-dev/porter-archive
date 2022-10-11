package slack

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models/integrations"
)

type IncidentNotifier struct {
	slackInts []*integrations.SlackIntegration
}

func NewIncidentNotifier(slackInts ...*integrations.SlackIntegration) *IncidentNotifier {
	return &IncidentNotifier{
		slackInts: slackInts,
	}
}

func (s *IncidentNotifier) NotifyNew(incident *types.Incident, url string) error {
	res := []*SlackBlock{}

	topSectionMarkdwn := fmt.Sprintf(
		":warning: Your application %s crashed on Porter. <%s|View the incident.>",
		"`"+incident.ReleaseName+"`",
		url,
	)

	createdAt := incident.CreatedAt

	res = append(
		res,
		getMarkdownBlock(topSectionMarkdwn),
		getDividerBlock(),
		getMarkdownBlock(fmt.Sprintf("*Namespace:* %s", "`"+incident.ReleaseNamespace+"`")),
		getMarkdownBlock(fmt.Sprintf("*Name:* %s", "`"+incident.ReleaseName+"`")),
		getMarkdownBlock(fmt.Sprintf(
			"*Created at:* <!date^%d^ {date_num} {time_secs}| %s>",
			createdAt.Unix(),
			createdAt.Format("2006-01-02 15:04:05 UTC"),
		)),
		getMarkdownBlock(fmt.Sprintf("```\n%s\n```", incident.Summary)),
	)

	slackPayload := &SlackPayload{
		Blocks: res,
	}

	payload, err := json.Marshal(slackPayload)

	if err != nil {
		return err
	}

	reqBody := bytes.NewReader(payload)
	client := &http.Client{
		Timeout: time.Second * 5,
	}

	for _, slackInt := range s.slackInts {
		_, err := client.Post(string(slackInt.Webhook), "application/json", reqBody)

		if err != nil {
			return err
		}
	}

	return nil
}

func (s *IncidentNotifier) NotifyResolved(incident *types.Incident, url string) error {
	res := []*SlackBlock{}

	createdAt := incident.CreatedAt
	resolvedAt := incident.UpdatedAt

	topSectionMarkdwn := fmt.Sprintf(
		":white_check_mark: The incident for application %s has been resolved. <%s|View the incident.>",
		"`"+incident.ReleaseName+"`",
		url,
	)

	res = append(
		res,
		getMarkdownBlock(topSectionMarkdwn),
		getDividerBlock(),
		getMarkdownBlock(fmt.Sprintf("*Namespace:* %s", "`"+incident.ReleaseNamespace+"`")),
		getMarkdownBlock(fmt.Sprintf("*Name:* %s", "`"+incident.ReleaseName+"`")),
		getMarkdownBlock(fmt.Sprintf(
			"*Created at:* <!date^%d^ {date_num} {time_secs}| %s>",
			createdAt.Unix(),
			createdAt.Format("2006-01-02 15:04:05 UTC"),
		)),
		getMarkdownBlock(fmt.Sprintf(
			"*Resolved at:* <!date^%d^ {date_num} {time_secs}| %s>",
			resolvedAt.Unix(),
			resolvedAt.Format("2006-01-02 15:04:05 UTC"),
		)),
		getMarkdownBlock(fmt.Sprintf("*Incident Summary:*")),
		getMarkdownBlock(fmt.Sprintf("```\n%s\n```", incident.Summary)),
	)

	slackPayload := &SlackPayload{
		Blocks: res,
	}

	payload, err := json.Marshal(slackPayload)

	if err != nil {
		return err
	}

	reqBody := bytes.NewReader(payload)
	client := &http.Client{
		Timeout: time.Second * 5,
	}

	for _, slackInt := range s.slackInts {
		_, err := client.Post(string(slackInt.Webhook), "application/json", reqBody)

		if err != nil {
			return err
		}
	}

	return nil
}
