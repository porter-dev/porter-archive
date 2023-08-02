package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type Revision struct {
	gorm.Model

	Version uint

	PorterAppID uint
	PorterApp   PorterApp

	PorterYAML string
}

// ToRevisionType generates an external types.Revision to be shared over REST
func (r *Revision) ToRevisionType() *types.Revision {
	return &types.Revision{
		ID:          r.ID,
		Version:     r.Version,
		PorterAppID: r.PorterAppID,
		PorterYAML:  r.PorterYAML,
	}
}