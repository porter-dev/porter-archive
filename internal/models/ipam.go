package models

import (
	"net"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Ipam represents an entry in the Ipam table
type Ipam struct {
	gorm.Model

	// ID is a UUID for the APIContract
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// ProjectID is the ID of the project that the config belongs to.
	// This should be a foreign key, but GORM doesnt play well with FKs.
	ProjectID int `json:"project_id"`

	CIDR net.IPNet `gorm:"type:cidr;column:cidr_range"`
}

// TableName overrides the table name
func (Ipam) TableName() string {
	return "ipam"
}
