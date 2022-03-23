package slack

import (
	"fmt"
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
	blockSet := &goslack.Blocks{}

	topSectionMarkdwn := fmt.Sprintf(
		":warning: Your application %s crashed on Porter. <%s|View the incident.>",
		"`"+incident.ReleaseName+"`",
		url,
	)

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewSectionBlock(
		goslack.NewTextBlockObject(
			"mrkdwn", topSectionMarkdwn, true, false,
		), nil, nil,
	))

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewDividerBlock())

	namespace := strings.Split(incident.ID, ":")[2]
	createdAt := time.Unix(incident.CreatedAt, 0).UTC()

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewContextBlock(
		"", goslack.NewTextBlockObject(
			"mrkdwn",
			fmt.Sprintf("*Name:* %s", "`"+incident.ReleaseName+"`"),
			false, false,
		),
	))

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewContextBlock(
		"", goslack.NewTextBlockObject(
			"mrkdwn",
			fmt.Sprintf("*Namespace:* %s", "`"+namespace+"`"),
			false, false,
		),
	))

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewContextBlock(
		"", goslack.NewTextBlockObject(
			"mrkdwn",
			fmt.Sprintf(
				"*Created at:* <!date^%d^Alerted at {date_num} {time_secs}|Alerted at %s>",
				createdAt.Unix(),
				createdAt.Format("2006-01-02 15:04:05 UTC"),
			),
			false, false,
		),
	))

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewSectionBlock(
		goslack.NewTextBlockObject(
			"mrkdwn", fmt.Sprintf("```\n%s\n```", incident.LatestMessage), false, false,
		), nil, nil,
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

func (s *IncidentsNotifier) NotifyResolved(incident *porter_agent.Incident, url string) error {
	blockSet := &goslack.Blocks{}

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewSectionBlock(
		goslack.NewTextBlockObject(
			"plain_text", "✅ Incident resolved for your Porter application", true, false,
		), nil, nil,
	))

	namespace := strings.Split(incident.ID, ":")[2]
	createdAt := time.Unix(incident.CreatedAt, 0).UTC().Format(time.RFC850)
	resolvedAt := time.Unix(incident.UpdatedAt, 0).UTC().Format(time.RFC850)

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewContextBlock(
		"", goslack.NewTextBlockObject(
			"plain_text",
			fmt.Sprintf("Release: %s\nNamespace: %s\nCreated at: %s\nResolved at: %s", incident.ReleaseName, namespace, createdAt, resolvedAt),
			false, false,
		),
	))

	blockSet.BlockSet = append(blockSet.BlockSet, goslack.NewActionBlock(
		"", &goslack.ButtonBlockElement{
			Type: goslack.METButton,
			Text: goslack.NewTextBlockObject(
				"plain_text", "View Incident", false, false,
			),
			URL: url,
		},
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
