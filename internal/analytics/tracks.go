package analytics

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
	segment "gopkg.in/segmentio/analytics-go.v3"
)

type segmentTrack interface {
	getUserId() string
	getEvent() SegmentEvent
	getProperties() segment.Properties
}

type segmentNewUserTrack struct {
	userId    string
	userEmail string
}

// Constructor for track of type "New User"
// Tracks when a user has registered
func CreateSegmentNewUserTrack(user *models.User) *segmentNewUserTrack {
	userId := fmt.Sprintf("%v", user.ID)

	return &segmentNewUserTrack{
		userId:    userId,
		userEmail: user.Email,
	}
}

func (t *segmentNewUserTrack) getUserId() string {
	return t.userId
}

func (t *segmentNewUserTrack) getEvent() SegmentEvent {
	return NewUser
}

func (t *segmentNewUserTrack) getProperties() segment.Properties {
	return segment.NewProperties().Set("email", t.userEmail)
}

type segmentRedeployViaWebhookTrack struct {
	userId     string
	repository string
}

// Constructor for track of type "Triggered Re-deploy via Webhook"
// tracks whenever a repository is redeployed via webhook call
func CreateSegmentRedeployViaWebhookTrack(userId string, repository string) *segmentRedeployViaWebhookTrack {
	return &segmentRedeployViaWebhookTrack{
		userId:     userId,
		repository: repository,
	}
}

func (t *segmentRedeployViaWebhookTrack) getUserId() string {
	return t.userId
}

func (t *segmentRedeployViaWebhookTrack) getEvent() SegmentEvent {
	return RedeployViaWebhook
}

func (t *segmentRedeployViaWebhookTrack) getProperties() segment.Properties {
	return segment.NewProperties().Set("repository", t.repository)
}

type segmentNewClusterEventTrack struct {
	userId    string
	projId string
	clusterName string
	clusterType string // EKS, DOKS, or GKE
	eventType string // connected, provisioned, or destroyed
}

// Constructor for track of type "New Cluster Event"
// tracks whenever a cluster is newly provisioned, connected, or destroyed.
func CreateSegmentNewClusterEvent(userId string, projId string, clusterName string, clusterType string, eventType string) *segmentNewClusterEventTrack {
	return &segmentNewClusterEventTrack{
		userId:     userId,
		projId: projId,
		clusterName: clusterName,
		clusterType: clusterType,
		eventType: eventType, 
	}
}

func (t *segmentNewClusterEventTrack) getUserId() string {
	return t.userId
}

func (t *segmentNewClusterEventTrack) getEvent() SegmentEvent {
	return NewClusterEvent
}

func (t *segmentNewClusterEventTrack) getProperties() segment.Properties {
	return segment.NewProperties().Set("Project ID", t.projId).Set("Cluster Name", t.clusterName).Set("Cluster Type", t.clusterType).Set("Event Type", t.eventType)
}