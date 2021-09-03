package policy

import (
	"fmt"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type PolicyDocumentLoader interface {
	LoadPolicyDocuments(userID, projectID uint) ([]*types.PolicyDocument, apierrors.RequestError)
}

// BasicPolicyDocumentLoader loads policy documents simply depending on the
type BasicPolicyDocumentLoader struct {
	projRepo repository.ProjectRepository
}

func NewBasicPolicyDocumentLoader(projRepo repository.ProjectRepository) *BasicPolicyDocumentLoader {
	return &BasicPolicyDocumentLoader{projRepo}
}

func (b *BasicPolicyDocumentLoader) LoadPolicyDocuments(
	userID, projectID uint,
) ([]*types.PolicyDocument, apierrors.RequestError) {
	// read role and case on role "kind"
	role, err := b.projRepo.ReadProjectRole(projectID, userID)

	if err != nil && err == gorm.ErrRecordNotFound {
		return nil, apierrors.NewErrForbidden(
			fmt.Errorf("user %d does not have a role in project %d", userID, projectID),
		)
	} else if err != nil {
		return nil, apierrors.NewErrInternal(err)
	}

	// load role based on role kind
	switch role.Kind {
	case types.RoleAdmin:
		return AdminPolicy, nil
	case types.RoleDeveloper:
		return DeveloperPolicy, nil
	case types.RoleViewer:
		return ViewerPolicy, nil
	default:
		return nil, apierrors.NewErrForbidden(
			fmt.Errorf("%s role not supported for user %d, project %d", string(role.Kind), userID, projectID),
		)
	}
}

var AdminPolicy = []*types.PolicyDocument{
	{
		Scope: types.ProjectScope,
		Verbs: types.ReadWriteVerbGroup(),
	},
}

var DeveloperPolicy = []*types.PolicyDocument{
	{
		Scope: types.ProjectScope,
		Verbs: types.ReadWriteVerbGroup(),
		Children: map[types.PermissionScope]*types.PolicyDocument{
			types.SettingsScope: {
				Scope: types.SettingsScope,
				Verbs: types.ReadVerbGroup(),
			},
		},
	},
}

var ViewerPolicy = []*types.PolicyDocument{
	{
		Scope: types.ProjectScope,
		Verbs: types.ReadVerbGroup(),
		Children: map[types.PermissionScope]*types.PolicyDocument{
			types.SettingsScope: {
				Scope: types.SettingsScope,
				Verbs: []types.APIVerb{},
			},
		},
	},
}
