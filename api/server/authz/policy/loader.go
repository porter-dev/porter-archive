package policy

import (
	"fmt"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type PolicyLoaderOpts struct {
	ProjectID, UserID uint
	Token             *models.APIToken
}

type PolicyDocumentLoader interface {
	LoadPolicyDocuments(opts *PolicyLoaderOpts) ([]*types.PolicyDocument, apierrors.RequestError)
}

// RepoPolicyDocumentLoader loads policy documents by reading from the repository database
type RepoPolicyDocumentLoader struct {
	projRepo   repository.ProjectRepository
	policyRepo repository.PolicyRepository
}

func NewBasicPolicyDocumentLoader(projRepo repository.ProjectRepository, policyRepo repository.PolicyRepository) *RepoPolicyDocumentLoader {
	return &RepoPolicyDocumentLoader{projRepo, policyRepo}
}

func (b *RepoPolicyDocumentLoader) LoadPolicyDocuments(
	opts *PolicyLoaderOpts,
) ([]*types.PolicyDocument, apierrors.RequestError) {
	if opts.Token != nil {
		// load the policy from the repo
		policy, err := b.policyRepo.ReadPolicy(opts.Token.ProjectID, opts.Token.PolicyUID)

		if err != nil {
			return nil, apierrors.NewErrInternal(err)
		}

		apiPolicy, err := policy.ToAPIPolicyType()

		if err != nil {
			return nil, apierrors.NewErrInternal(err)
		}

		return apiPolicy.Policy, nil
	} else if opts.ProjectID != 0 && opts.UserID != 0 {
		userID := opts.UserID
		projectID := opts.ProjectID
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

	return nil, apierrors.NewErrForbidden(
		fmt.Errorf("policy loader called with invalid arguments"),
	)
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
