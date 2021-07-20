package analytics

import (
	"github.com/porter-dev/porter/internal/logger"
	segment "gopkg.in/segmentio/analytics-go.v3"
)

type AnalyticsSegmentClient interface {
	Identify(SegmentIdentifier) error
	Track(SegmentTrack) error
}

type AnalyticsSegment struct {
	segment.Client
	isEnabled bool
	logger    *logger.Logger
}

//
/*
	Initialize the segment client and return a superset of it, the AnalyticsSegmentClient will handle cases when
	the segment client failed on initialization or not enabled
*/
func Initialize(segmentClientKey string, logger *logger.Logger) AnalyticsSegmentClient {
	if segmentClientKey != "" {

		client := segment.New(segmentClientKey)

		if client == nil {
			return &AnalyticsSegment{
				isEnabled: false,
				logger:    logger,
			}
		}

		return &AnalyticsSegment{
			Client:    client,
			isEnabled: true,
			logger:    logger,
		}
	}

	return &AnalyticsSegment{
		isEnabled: false,
		logger:    logger,
	}
}

/*
	Superset of segment client identify function, this will accept analytics defined identifiers only
	and will log an error if the client is not initialized
*/
func (c *AnalyticsSegment) Identify(identifier SegmentIdentifier) error {
	if !c.isEnabled {
		c.logger.Error().Msg("Analytics not enabled")
		return nil
	}

	err := c.Enqueue(segment.Identify{
		UserId: identifier.getUserId(),
		Traits: identifier.getTraits(),
	})
	return err
}

/*
	Superset of segment client track function, this will accept analytics defined tracks only
	and will log an error if the client is not initialized
*/
func (c *AnalyticsSegment) Track(track SegmentTrack) error {
	if !c.isEnabled {
		c.logger.Error().Msg("Analytics not enabled")
		return nil
	}

	err := c.Enqueue(segment.Track{
		UserId:     track.getUserId(),
		Event:      string(track.getEvent()),
		Properties: track.getProperties(),
	})

	return err
}
