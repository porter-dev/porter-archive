package models

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/encryption"
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

	Operations []Operation

	// The AWS integration that was used to create the infra
	AWSIntegrationID uint

	// The GCP integration that was used to create the infra
	GCPIntegrationID uint

	// The DO integration that was used to create the infra:
	// this points to an OAuthIntegrationID
	DOIntegrationID uint

	// The database id for the infra, if this infra provisioned a database
	DatabaseID uint

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	// The last-applied input variables to the provisioner
	LastApplied []byte
}

type Operation struct {
	gorm.Model

	UID     string `gorm:"unique"`
	InfraID uint
	Type    string
	Status  string
	Errored bool
	Error   string
}

func (o *Operation) ToOperationType() *types.Operation {
	return &types.Operation{
		UID:     o.UID,
		InfraID: o.InfraID,
		Type:    o.Type,
		Status:  o.Status,
		Errored: o.Errored,
		Error:   o.Error,
	}
}

func GetOperationID() (string, error) {
	return encryption.GenerateRandomBytes(10)
}

// ToInfraType generates an external Infra to be shared over REST
func (i *Infra) ToInfraType() *types.Infra {
	return &types.Infra{
		ID:               i.ID,
		CreatedAt:        i.CreatedAt,
		UpdatedAt:        i.UpdatedAt,
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
		lastApplied := &types.CreateECRInfraRequest{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["ecr_name"] = lastApplied.ECRName

		return resp
	case types.InfraEKS:
		lastApplied := &types.CreateEKSInfraRequest{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["eks_name"] = lastApplied.EKSName
		resp["machine_type"] = lastApplied.MachineType

		return resp
	case types.InfraGCR:
		return resp
	case types.InfraGKE:
		lastApplied := &types.CreateGKEInfraRequest{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["gke_name"] = lastApplied.GKEName

		return resp
	case types.InfraDOCR:
		lastApplied := &types.CreateDOCRInfraRequest{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["docr_name"] = lastApplied.DOCRName
		resp["docr_subscription_tier"] = lastApplied.DOCRSubscriptionTier

		return resp
	case types.InfraDOKS:
		lastApplied := &types.CreateDOKSInfraRequest{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["cluster_name"] = lastApplied.DOKSName
		resp["do_region"] = lastApplied.DORegion

		return resp
	case types.InfraRDS:
		lastApplied := &types.RDSInfraLastApplied{}

		if err := json.Unmarshal(i.LastApplied, lastApplied); err != nil {
			return resp
		}

		resp["cluster_id"] = fmt.Sprintf("%d", lastApplied.ClusterID)
		resp["aws_region"] = lastApplied.AWSRegion
		resp["db_name"] = lastApplied.DBName

		return resp
	}

	return resp
}

// GetID returns the unique id for this infra
func (i *Infra) GetUniqueName() string {
	return fmt.Sprintf("%s-%d-%d-%s", i.Kind, i.ProjectID, i.ID, i.Suffix)
}

// ParseUniqueName returns the (kind, projectID, infraID, suffix)
func ParseUniqueName(workspaceID string) (string, uint, uint, string, error) {
	strArr := strings.Split(workspaceID, "-")

	if len(strArr) != 4 {
		return "", 0, 0, "", fmt.Errorf("workspace id improperly formatted")
	}

	projID, err := strconv.ParseUint(strArr[1], 10, 64)

	if err != nil {
		return "", 0, 0, "", err
	}

	infraID, err := strconv.ParseUint(strArr[2], 10, 64)

	if err != nil {
		return "", 0, 0, "", err
	}

	return strArr[0], uint(projID), uint(infraID), strArr[3], nil
}

type UniqueNameWithOperation struct {
	Kind         string
	ProjectID    uint
	InfraID      uint
	Suffix       string
	OperationUID string
}

func ParseWorkspaceID(workspaceID string) (*UniqueNameWithOperation, error) {
	strArr := strings.Split(workspaceID, "-")

	if len(strArr) != 5 {
		return nil, fmt.Errorf("workspace id improperly formatted")
	}

	projID, err := strconv.ParseUint(strArr[1], 10, 64)

	if err != nil {
		return nil, err
	}

	infraID, err := strconv.ParseUint(strArr[2], 10, 64)

	if err != nil {
		return nil, err
	}

	if len(strArr[4]) != 10 {
		return nil, fmt.Errorf("operation uid is not length 10")
	}

	return &UniqueNameWithOperation{
		Kind:         strArr[0],
		ProjectID:    uint(projID),
		InfraID:      uint(infraID),
		Suffix:       strArr[3],
		OperationUID: strArr[4],
	}, nil
}

func GetWorkspaceID(infra *Infra, operation *Operation) string {
	return fmt.Sprintf("%s-%d-%d-%s-%s", infra.Kind, infra.ProjectID, infra.ID, infra.Suffix, operation.UID)
}
