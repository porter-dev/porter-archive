package models

import (
	"encoding/json"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type Policy struct {
	gorm.Model

	UniqueID string `gorm:"unique"`

	ProjectID       uint
	CreatedByUserID uint
	Name            string
	PolicyBytes     []byte
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
