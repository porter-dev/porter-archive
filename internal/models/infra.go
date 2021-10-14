package models

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner/input"
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

	// The ID of the user that created this infra
	CreatedByUserID uint

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
		ID:               i.ID,
		ProjectID:        i.ProjectID,
		Kind:             i.Kind,
		Status:           i.Status,
		AWSIntegrationID: i.AWSIntegrationID,
		DOIntegrationID:  i.DOIntegrationID,
		GCPIntegrationID: i.GCPIntegrationID,
		LastApplied:      i.SafelyGetLastApplied(),
	}
}

// SafeGetLastApplied gets non-sensitive values for the last applied configuration
func (i *Infra) SafelyGetLastApplied() map[string]string {
	resp := make(map[string]string)

	switch i.Kind {
	case types.InfraECR:
		lastApplied := &input.ECR{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["region"] = lastApplied.AWSRegion

		return resp
	case types.InfraEKS:
		lastApplied := &input.EKS{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["region"] = lastApplied.AWSRegion
		resp["cluster_name"] = lastApplied.ClusterName
		resp["machine_type"] = lastApplied.MachineType

		return resp
	case types.InfraGCR:
		lastApplied := &input.GCR{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["project_id"] = lastApplied.GCPProjectID
		resp["region"] = lastApplied.GCPRegion

		return resp
	case types.InfraGKE:
		lastApplied := &input.GKE{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["project_id"] = lastApplied.GCPProjectID
		resp["region"] = lastApplied.GCPRegion
		resp["cluster_name"] = lastApplied.ClusterName

		return resp
	case types.InfraDOCR:
		lastApplied := &input.DOCR{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["name"] = lastApplied.DOCRName
		resp["subscription_tier"] = lastApplied.DOCRSubscriptionTier

		return resp
	case types.InfraDOKS:
		lastApplied := &input.DOKS{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["cluster_name"] = lastApplied.ClusterName
		resp["region"] = lastApplied.DORegion

		return resp
	}

	return resp
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
