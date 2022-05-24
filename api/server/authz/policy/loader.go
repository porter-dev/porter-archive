package policy

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type PolicyLoaderOpts struct {
	ProjectID, UserID uint
	ProjectToken      *models.APIToken
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
	if opts.ProjectToken != nil {
		// check that the token belongs to the project, in this case it's solely project-scoped
		if opts.ProjectID == 0 || opts.ProjectToken.ProjectID == 0 || opts.ProjectID != opts.ProjectToken.ProjectID {
			return nil, apierrors.NewErrForbidden(fmt.Errorf("project id %d does not match token id %d", opts.ProjectID, opts.ProjectToken.ProjectID))
		}

		proj, err := b.projRepo.ReadProject(opts.ProjectID)

		if err != nil {
			return nil, apierrors.NewErrForbidden(fmt.Errorf("error fetching project: %w", err))
		}

		if !proj.APITokensEnabled {
			return nil, apierrors.NewErrForbidden(fmt.Errorf("api tokens are not enabled for this project"))
		}

		// load the policy
		apiPolicy, reqErr := GetAPIPolicyFromUID(b.policyRepo, opts.ProjectToken.ProjectID, opts.ProjectToken.PolicyUID)

		if reqErr != nil {
			return nil, reqErr
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
			return types.AdminPolicy, nil
		case types.RoleDeveloper:
			return types.DeveloperPolicy, nil
		case types.RoleViewer:
			return types.ViewerPolicy, nil
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

func GetAPIPolicyFromUID(policyRepo repository.PolicyRepository, projectID uint, uid string) (*types.APIPolicy, apierrors.RequestError) {
	switch uid {
	case "admin":
		return &types.APIPolicy{
			APIPolicyMeta: &types.APIPolicyMeta{
				Name: "admin",
				UID:  "admin",
			},
			Policy: types.AdminPolicy,
		}, nil
	case "developer":
		return &types.APIPolicy{
			APIPolicyMeta: &types.APIPolicyMeta{
				Name: "developer",
				UID:  "developer",
			},
			Policy: types.DeveloperPolicy,
		}, nil
	case "viewer":
		return &types.APIPolicy{
			APIPolicyMeta: &types.APIPolicyMeta{
				Name: "viewer",
				UID:  "viewer",
			},
			Policy: types.ViewerPolicy,
		}, nil
	default:
		// look up the policy and make sure it exists
		policyModel, err := policyRepo.ReadPolicy(projectID, uid)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, apierrors.NewErrPassThroughToClient(
					fmt.Errorf("policy not found in project"),
					http.StatusBadRequest,
				)
			}

			return nil, apierrors.NewErrInternal(err)
		}

		apiPolicy, err := policyModel.ToAPIPolicyType()

		if err != nil {
			return nil, apierrors.NewErrInternal(err)
		}

		return apiPolicy, nil
	}
}
