package billing

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type BillingAddProjectHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewBillingAddProjectHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) http.Handler {
	return &BillingAddProjectHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, nil),
	}
}

// Adds a project to a billing team in IronPlans. Takes the following steps:
// 1. Looks for project billing data for the given project.
// 2. Checks for project billing data. If the project already has billing data, move to step 3b, otherwise 3a.
// 3a. Creates a new team in IronPlans, and creates a custom plan in IronPlans. Subscribes the team to the plan.
// 3b. Finds the relevant team in IronPlans, creates a custom plan, and updates the subscription for the team.
// 4. If team was created, creates ProjectBilling object.
// 5. If team was created, finds all roles in the team. Adds all roles as a team member to the project billing. Updates UserBilling models.
func (c *BillingAddProjectHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// validation for internal token
	// if internal token is empty, throw forbidden error; this server is misconfigured
	if c.Config().ServerConf.RetoolToken == "" {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("internal retool token does not exist: re-configure the server")))
		return
	}

	reqToken := r.Header.Get("Authorization")
	splitToken := strings.Split(reqToken, "Bearer")

	if len(splitToken) != 2 {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("no token found")))
		return
	}

	reqToken = strings.TrimSpace(splitToken[1])

	if reqToken != c.Config().ServerConf.RetoolToken {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("passed retool token does not match env")))
		return
	}

	request := &types.AddProjectBillingRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// make sure the project exists; if it does not exist, throw forbidden error
	proj, err := c.Repo().Project().ReadProject(request.ProjectID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// look for project billing data for the given project
	teamID, err := c.Config().BillingManager.GetTeamID(proj)
	isNotFound := err != nil && errors.Is(err, gorm.ErrRecordNotFound)

	// if the error is not nil and is not "ErrRecordNotFound", throw error
	if err != nil && !isNotFound {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// if the team is not found, create a new team
	if isNotFound {
		teamID, err = c.Config().BillingManager.CreateTeam(proj)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	// determine whether to place the team on a custom plan or an existing plan
	if request.ExistingPlanName != "" {
		err = addToExistingPlan(c.Config(), request.ExistingPlanName, teamID)
	} else {
		err = addToCustomPlan(c.Config(), teamID, proj, request)
	}

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// add users in project to the plan
	projRoles, err := c.Repo().Project().ListProjectRoles(proj.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	for _, role := range projRoles {
		user, err := c.Repo().User().ReadUser(role.UserID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		err = c.Config().BillingManager.AddUserToTeam(teamID, user, &role)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	w.WriteHeader(http.StatusOK)
}

func addToCustomPlan(c *config.Config, teamID string, proj *models.Project, req *types.AddProjectBillingRequest) error {
	// create a new plan in IronPlans
	planID, err := c.BillingManager.CreatePlan(teamID, proj, req)

	if err != nil {
		return err
	}

	// create a new subscription to this plan in IronPlans
	return c.BillingManager.CreateOrUpdateSubscription(teamID, planID)
}

func addToExistingPlan(c *config.Config, existingPlanName, teamID string) error {
	// look for existing plans in IronPlans
	planID, err := c.BillingManager.GetExistingPublicPlan(existingPlanName)

	if err != nil {
		return err
	}

	// create a new subscription to this plan in IronPlans
	return c.BillingManager.CreateOrUpdateSubscription(teamID, planID)
}
