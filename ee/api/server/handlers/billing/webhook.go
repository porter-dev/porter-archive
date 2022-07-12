package billing

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"gorm.io/gorm"
)

type BillingWebhookHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewBillingWebhookHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) http.Handler {
	return &BillingWebhookHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, nil),
	}
}

func (c *BillingWebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	payload, err := ioutil.ReadAll(r.Body)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// verify webhook secret
	signature := r.Header.Get("x-signature")

	if !c.Config().BillingManager.VerifySignature(signature, payload) {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(
			fmt.Errorf("could not verify signature for billing webhook"),
		))

		return
	}

	// parse usage and update project
	newUsage, features, err := c.Config().BillingManager.ParseProjectUsageFromWebhook(payload)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// newUsage will be nil if webhook event type is not "subscription", so return without
	// updating usage in this case
	if newUsage == nil {
		return
	}

	// update the project's usage
	existingUsage, err := c.Repo().ProjectUsage().ReadProjectUsage(newUsage.ProjectID)
	notFound := errors.Is(err, gorm.ErrRecordNotFound)

	if !notFound && err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if notFound {
		_, err = c.Repo().ProjectUsage().CreateProjectUsage(newUsage)
	} else {
		newUsage.ID = existingUsage.ID
		_, err = c.Repo().ProjectUsage().UpdateProjectUsage(newUsage)
	}

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// update the feature flags
	project, err := c.Repo().Project().ReadProject(newUsage.ProjectID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if managedDatabasesEnabled, err := strconv.ParseBool(features.ManagedDatabasesEnabled); err == nil {
		project.RDSDatabasesEnabled = managedDatabasesEnabled
	}

	if managedInfraEnabled, err := strconv.ParseBool(features.ManagedInfraEnabled); err == nil {
		project.ManagedInfraEnabled = managedInfraEnabled
	}

	if stacksEnabled, err := strconv.ParseBool(features.StacksEnabled); err == nil {
		project.StacksEnabled = stacksEnabled
	}

	if previewEnvsEnabled, err := strconv.ParseBool(features.PreviewEnvironmentsEnabled); err == nil {
		project.PreviewEnvsEnabled = previewEnvsEnabled
	}

	_, err = c.Repo().Project().UpdateProject(project)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
