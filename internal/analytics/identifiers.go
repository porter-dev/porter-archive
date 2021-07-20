package analytics

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
	segment "gopkg.in/segmentio/analytics-go.v3"
)

type SegmentIdentifier interface {
	getUserId() string
	getTraits() segment.Traits
}

type SegmentIdentifyNewUser struct {
	userId    string
	userEmail string
	isGithub  bool
}

func CreateSegmentIdentifyNewUser(user *models.User, registeredViaGithub bool) *SegmentIdentifyNewUser {
	userId := fmt.Sprintf("%v", user.ID)
	return &SegmentIdentifyNewUser{
		userId:    userId,
		userEmail: user.Email,
		isGithub:  registeredViaGithub,
	}
}

func (i SegmentIdentifyNewUser) getUserId() string {
	return i.userId
}

func (i SegmentIdentifyNewUser) getTraits() segment.Traits {
	var githubTrait string

	if i.isGithub {
		githubTrait = "true"
	} else {
		githubTrait = "false"
	}

	return segment.NewTraits().
		SetEmail(i.userEmail).
		Set("github", githubTrait)
}
