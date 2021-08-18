package analytics

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
	segment "gopkg.in/segmentio/analytics-go.v3"
)

type segmentIdentifier interface {
	getUserId() string
	getTraits() segment.Traits
}

type segmentIdentifyNewUser struct {
	userId    string
	userEmail string
	isGithub  bool
}

// CreateSegmentIdentifyUser creates an identifier for users
func CreateSegmentIdentifyUser(user *models.User) *segmentIdentifyNewUser {
	userId := fmt.Sprintf("%v", user.ID)

	return &segmentIdentifyNewUser{
		userId:    userId,
		userEmail: user.Email,
		isGithub:  user.GithubUserID != 0,
	}
}

func (i segmentIdentifyNewUser) getUserId() string {
	return i.userId
}

func (i segmentIdentifyNewUser) getTraits() segment.Traits {
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
