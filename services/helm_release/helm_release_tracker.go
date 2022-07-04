package helmrelease

import (
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type HelmReleaseTracker struct {
	db               *gorm.DB
	repo             repository.Repository
	doConf           *oauth2.Config
	whitelistedUsers map[uint]uint
}

const stepSize = 100
