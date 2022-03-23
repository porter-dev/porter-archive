package slack

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/porter-dev/porter/api/types"
	porter_agent "github.com/porter-dev/porter/internal/kubernetes/porter_agent/v2"
	"github.com/porter-dev/porter/internal/models/integrations"
	goslack "github.com/slack-go/slack"
)

type IncidentsNotifier struct {
	slackInts []*integrations.SlackIntegration
	Config    *types.NotificationConfig
}

func NewIncidentsNotifier(conf *types.NotificationConfig, slackInts ...*integrations.SlackIntegration) *IncidentsNotifier {
	return &IncidentsNotifier{
		slackInts: slackInts,
		Config:    conf,
	}
}

func (s *IncidentsNotifier) NotifyNew(incident *porter_agent.Incident, url string) error {
	res := []*SlackBlock{}

	topSectionMarkdwn := fmt.Sprintf(
		":warning: Your application %s crashed on Porter. <%s|View the incident.>",
		"`"+incident.ReleaseName+"`",
		url,
	)

	namespace := strings.Split(incident.ID, ":")[2]
	createdAt := time.Unix(incident.CreatedAt, 0).UTC()

	res = append(
		res,
		getMarkdownBlock(topSectionMarkdwn),
		getDividerBlock(),
		getMarkdownBlock(fmt.Sprintf("*Namespace:* %s", "`"+namespace+"`")),
		getMarkdownBlock(fmt.Sprintf("*Name:* %s", "`"+incident.ReleaseName+"`")),
		getMarkdownBlock(fmt.Sprintf(
			"*Created at:* <!date^%d^Alerted at {date_num} {time_secs}|Alerted at %s>",
			createdAt.Unix(),
			createdAt.Format("2006-01-02 15:04:05 UTC"),
		)),
		getMarkdownBlock(fmt.Sprintf("```\n%s\n```", incident.LatestMessage)),
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

func (s *IncidentsNotifier) NotifyResolved(incident *porter_agent.Incident, url string) error {
	blockSet := &goslack.Blocks{}

	namespace := strings.Split(incident.ID, ":")[2]
	createdAt := time.Unix(incident.CreatedAt, 0).UTC()
	resolvedAt := time.Unix(incident.UpdatedAt, 0).UTC()

	topSectionMarkdwn := fmt.Sprintf(
		":white_check_mark: The incident for application %s has been resolved. <%s|View the incident.>",
		"`"+incident.ReleaseName+"`",
		url,
	)

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewTextBlockObject(
		goslack.MarkdownType, topSectionMarkdwn, false, false,
	), goslack.NewDividerBlock(), goslack.NewTextBlockObject(
		goslack.MarkdownType,
		fmt.Sprintf("*Name:* %s", "`"+incident.ReleaseName+"`"),
		false, false,
	), goslack.NewTextBlockObject(
		goslack.MarkdownType,
		fmt.Sprintf("*Namespace:* %s", "`"+namespace+"`"),
		false, false,
	), goslack.NewTextBlockObject(
		goslack.MarkdownType,
		fmt.Sprintf(
			"*Created at:* <!date^%d^Alerted at {date_num} {time_secs}|Alerted at %s>",
			createdAt.Unix(),
			createdAt.Format("2006-01-02 15:04:05 UTC"),
		),
		false, false,
	), goslack.NewTextBlockObject(
		goslack.MarkdownType,
		fmt.Sprintf(
			"*Resolved at:* <!date^%d^Alerted at {date_num} {time_secs}|Alerted at %s>",
			resolvedAt.Unix(),
			resolvedAt.Format("2006-01-02 15:04:05 UTC"),
		),
		false, false,
	))

	for _, slackInt := range s.slackInts {
		err := goslack.PostWebhook(string(slackInt.Webhook), &goslack.WebhookMessage{
			Username: "Porter Agent",
			Channel:  slackInt.Channel,
			Blocks:   blockSet,
		})

		if err != nil {
			return err
		}
	}

	return nil
}
