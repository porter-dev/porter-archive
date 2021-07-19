package analytics

import (
	"fmt"

	segment "gopkg.in/segmentio/analytics-go.v3"
)

type AnalyticsSegmentClient interface {
	Identify(userId string, userEmail string, isGithub bool) error
	Track(userId string, event string, properties segment.Properties) error
}

type AnalyticsSegment struct {
	segment.Client
	isEnabled bool
}

func Initialize(segmentClientKey string) AnalyticsSegmentClient {
	if segmentClientKey != "" {

		client := segment.New(segmentClientKey)

		return &AnalyticsSegment{
			Client:    client,
			isEnabled: true,
		}
	}

	return &AnalyticsSegment{
		isEnabled: false,
	}
}

func (c *AnalyticsSegment) Identify(userId string, userEmail string, isGithub bool) error {

	if !c.isEnabled {
		fmt.Println("Analytics not enabled")
		return nil
	}

	err := c.Enqueue(segment.Identify{
		UserId: userId,
		Traits: segment.NewTraits().
			SetEmail(userEmail).
			Set("github", isGithub),
	})
	return err
}

func (c *AnalyticsSegment) Track(userId string, event string, properties segment.Properties) error {
	if !c.isEnabled {
		fmt.Println("Analytics not enabled")
		return nil
	}

	err := c.Enqueue(segment.Track{
		UserId:     userId,
		Event:      event,
		Properties: properties,
	})

	return err
}
