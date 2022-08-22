package migrate_legacy_rbac

import (
	"encoding/json"
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	gorm "github.com/porter-dev/porter/internal/repository/gorm"
	lr "github.com/porter-dev/porter/pkg/logger"

	_gorm "gorm.io/gorm"
)

// process 100 records at a time
const stepSize = 100

func MigrateFromLegacyRBAC(db *_gorm.DB, logger *lr.Logger) error {
	logger.Info().Msg("initiated migration from legacy RBAC")

	var count int64

	if err := db.Model(&models.Project{}).Count(&count).Error; err != nil {
		return err
	}

	projectRepo := gorm.NewProjectRepository(db).(*gorm.ProjectRepository)
	projectRoleRepo := gorm.NewProjectRoleRepository(db).(*gorm.ProjectRoleRepository)
	policyRepo := gorm.NewPolicyRepository(db).(*gorm.PolicyRepository)

	logger.Info().Msgf("found %d projects", count)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		projects := []*models.Project{}

		if err := db.Preload("Roles").Order("id asc").Offset(i * stepSize).Limit(stepSize).Find(&projects).Error; err != nil {
			return err
		}

		for _, project := range projects {
			logger.Info().Msgf("starting migration for project ID %d", project.ID)

			var legacyRoleCount int64

			if err := db.Where("unique_id = ?", fmt.Sprintf("%d-%s", project.ID, types.RoleAdmin)).
				Find(&models.ProjectRole{}).Count(&legacyRoleCount).Error; err != nil {
				return err
			} else if legacyRoleCount == 0 {
				err := createNewRole(project.ID, types.RoleAdmin, projectRoleRepo, policyRepo)

				if err != nil {
					return err
				}
			}

			if err := db.Where("unique_id = ?", fmt.Sprintf("%d-%s", project.ID, types.RoleDeveloper)).
				Find(&models.ProjectRole{}).Count(&legacyRoleCount).Error; err != nil {
				return err
			} else if legacyRoleCount == 0 {
				err := createNewRole(project.ID, types.RoleDeveloper, projectRoleRepo, policyRepo)

				if err != nil {
					return err
				}
			}

			if err := db.Where("unique_id = ?", fmt.Sprintf("%d-%s", project.ID, types.RoleViewer)).
				Find(&models.ProjectRole{}).Count(&legacyRoleCount).Error; err != nil {
				return err
			} else if legacyRoleCount == 0 {
				err := createNewRole(project.ID, types.RoleViewer, projectRoleRepo, policyRepo)

				if err != nil {
					return err
				}
			}

			legacyRoleKindUsersMap := map[types.RoleKind][]uint{
				types.RoleAdmin:     make([]uint, 0),
				types.RoleDeveloper: make([]uint, 0),
				types.RoleViewer:    make([]uint, 0),
				types.RoleCustom:    make([]uint, 0), // added this for possible cases of custom roles in the DB?
			}

			for _, legacyRole := range project.Roles {
				legacyRoleKindUsersMap[legacyRole.Kind] = append(legacyRoleKindUsersMap[legacyRole.Kind], legacyRole.UserID)
			}

			delete(legacyRoleKindUsersMap, types.RoleCustom) // added just to make sure nothing goes wrong from here

			for roleKind, users := range legacyRoleKindUsersMap {
				if len(users) > 0 {
					err := projectRoleRepo.UpdateUsersInProjectRole(project.ID, fmt.Sprintf("%d-%s", project.ID, roleKind), users)

					if err != nil {
						return err
					}
				}
			}

			for _, legacyRole := range project.Roles {
				// delete legacy role from project
				if _, err := projectRepo.DeleteLegacyProjectRole(project.ID, legacyRole.UserID); err != nil {
					return fmt.Errorf("error encountered while deleting legacy project role: %w", err)
				}
			}

			logger.Info().Msgf("finished migration for project ID %d", project.ID)
		}
	}

	logger.Info().Msg("legacy RBAC migration completed")
	return nil
}

func createNewRole(
	projectID uint,
	kind types.RoleKind,
	projectRoleRepo repository.ProjectRoleRepository,
	policyRepo repository.PolicyRepository,
) error {
	// for legacy roles - admin, developer, viewer (kinds)
	// default role name such as <project ID>-<kind> for uniqueness
	// similarly, create policy for each new default role as <project ID>-<kind>-project-role-policy

	uid, err := encryption.GenerateRandomBytes(16)

	if err != nil {
		return err
	}

	var policyBytes []byte

	switch kind {
	case types.RoleAdmin:
		policyBytes, err = json.Marshal(types.AdminPolicy)

		if err != nil {
			return err
		}
	case types.RoleDeveloper:
		policyBytes, err = json.Marshal(types.DeveloperPolicy)

		if err != nil {
			return err
		}
	case types.RoleViewer:
		policyBytes, err = json.Marshal(types.ViewerPolicy)

		if err != nil {
			return err
		}
	}

	newPolicy, err := policyRepo.CreatePolicy(&models.Policy{
		UniqueID:    uid,
		ProjectID:   projectID,
		Name:        fmt.Sprintf("%s-project-role-policy", kind),
		PolicyBytes: policyBytes,
	})

	if err != nil {
		return err
	}

	_, err = projectRoleRepo.CreateProjectRole(&models.ProjectRole{
		UniqueID:  fmt.Sprintf("%d-%s", projectID, kind),
		ProjectID: projectID,
		PolicyUID: newPolicy.UniqueID,
		Name:      string(kind),
	})

	if err != nil {
		// delete newly created policy first
		policyRepo.DeletePolicy(newPolicy)

		return err
	}

	return nil
}
