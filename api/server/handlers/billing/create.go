package billing

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/setupintent"
)

type CreateBillingHandler struct {
	handlers.PorterHandlerWriter
}

func NewCreateBillingHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateBillingHandler {
	return &CreateBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

type CheckoutData struct {
	ClientSecret string `json:"clientSecret"`
}

func (c *CreateBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	stripe.Key = c.Config().ServerConf.StripeSecretKey
	params := &stripe.SetupIntentParams{
		Customer: stripe.String(""),
		AutomaticPaymentMethods: &stripe.SetupIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(false),
		},
		PaymentMethodTypes: []*string{stripe.String("card")},
		Metadata: map[string]string{
			"project_id": strconv.FormatUint(uint64(proj.ID), 10),
		},
	}

	intent, err := setupintent.New(params)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating setup intent: %w", err)))
		return
	}

	data := CheckoutData{
		ClientSecret: intent.ClientSecret,
	}

	c.WriteResult(w, r, data)
}
