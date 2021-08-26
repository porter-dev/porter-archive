package models

import (
	"fmt"
	"strconv"
	"strings"

	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
)

// Infra represents the metadata for an infrastructure type provisioned on
// Porter
type Infra struct {
	gorm.Model

	// The type of infra that was provisioned
	Kind types.InfraKind `json:"kind"`

	// A random 6-byte suffix to ensure workspace/stream ids are unique
	Suffix string

	// The project that this infra belongs to
	ProjectID uint `json:"project_id"`

	// Status is the status of the infra
	Status types.InfraStatus `json:"status"`

	// The AWS integration that was used to create the infra
	AWSIntegrationID uint

	// The GCP integration that was used to create the infra
	GCPIntegrationID uint

	// The DO integration that was used to create the infra:
	// this points to an OAuthIntegrationID
	DOIntegrationID uint

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	// The last-applied input variables to the provisioner
	LastApplied []byte
}

// ToInfraType generates an external Infra to be shared over REST
func (i *Infra) ToInfraType() *types.Infra {
	return &types.Infra{
		ID:        i.ID,
		ProjectID: i.ProjectID,
		Kind:      i.Kind,
		Status:    i.Status,
	}
}

// GetID returns the unique id for this infra
func (i *Infra) GetUniqueName() string {
	return fmt.Sprintf("%s-%d-%d-%s", i.Kind, i.ProjectID, i.ID, i.Suffix)
}

// ParseUniqueName returns the (kind, projectID, infraID, suffix)
func ParseUniqueName(workspaceID string) (string, uint, uint, error) {
	strArr := strings.Split(workspaceID, "-")

	if len(strArr) < 3 {
		return "", 0, 0, fmt.Errorf("workspace id improperly formatted")
	}

	projID, err := strconv.ParseUint(strArr[1], 10, 64)

	if err != nil {
		return "", 0, 0, err
	}

	infraID, err := strconv.ParseUint(strArr[2], 10, 64)

	if err != nil {
		return "", 0, 0, err
	}

	return strArr[0], uint(projID), uint(infraID), nil
}
