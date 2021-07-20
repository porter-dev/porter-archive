package analytics

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
	segment "gopkg.in/segmentio/analytics-go.v3"
)

type SegmentTrack interface {
	getUserId() string
	getEvent() SegmentEvent
	getProperties() segment.Properties
}

type SegmentNewUserTrack struct {
	userId    string
	userEmail string
}

func CreateSegmentNewUserTrack(user *models.User) *SegmentNewUserTrack {
	userId := fmt.Sprintf("%v", user.ID)

	return &SegmentNewUserTrack{
		userId:    userId,
		userEmail: user.Email,
	}
}

func (t *SegmentNewUserTrack) getUserId() string {
	return t.userId
}

func (t *SegmentNewUserTrack) getEvent() SegmentEvent {
	return NewUser
}

func (t *SegmentNewUserTrack) getProperties() segment.Properties {
	return segment.NewProperties().Set("email", t.userEmail)
}

type SegmentRedeployViaWebhookTrack struct {
	userId     string
	repository interface{}
}

func CreateSegmentRedeployViaWebhookTrack(userId string, repository interface{}) *SegmentRedeployViaWebhookTrack {
	return &SegmentRedeployViaWebhookTrack{
		userId:     userId,
		repository: repository,
	}
}

func (t *SegmentRedeployViaWebhookTrack) getUserId() string {
	return t.userId
}

func (t *SegmentRedeployViaWebhookTrack) getEvent() SegmentEvent {
	return RedeployViaWebhook
}

func (t *SegmentRedeployViaWebhookTrack) getProperties() segment.Properties {
	return segment.NewProperties().Set("repository", t.repository)
}
