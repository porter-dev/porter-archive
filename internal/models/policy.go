package models

import (
	"encoding/json"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type Policy struct {
	gorm.Model

	UniqueID string `gorm:"unique"`

	ProjectID       uint   `gorm:"not null;check:project_id>0"`
	CreatedByUserID uint   `gorm:"not null;check:created_by_user_id>0"`
	Name            string `gorm:"not null;check:name!=''"`
	PolicyBytes     []byte `gorm:"not null"`
}

func (p *Policy) ToAPIPolicyTypeMeta() *types.APIPolicyMeta {
	return &types.APIPolicyMeta{
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
		UID:       p.UniqueID,
		ProjectID: p.ProjectID,
		Name:      p.Name,
	}
}

func (p *Policy) ToAPIPolicyType() (*types.APIPolicy, error) {
	policy := []*types.PolicyDocument{}

	err := json.Unmarshal(p.PolicyBytes, &policy)

	if err != nil {
		return nil, err
	}

	return &types.APIPolicy{
		APIPolicyMeta: p.ToAPIPolicyTypeMeta(),
		Policy:        policy,
	}, nil
}
