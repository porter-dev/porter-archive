package billing

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/setupintent"
)

type CreatePaymentMethodHandler struct {
	handlers.PorterHandlerWriter
}

func NewCreatePaymentMethodHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreatePaymentMethodHandler {
	return &CreatePaymentMethodHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

type CheckoutData struct {
	ClientSecret string `json:"clientSecret"`
}

func (c *CreatePaymentMethodHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	stripe.Key = ""
	params := &stripe.SetupIntentParams{
		Customer: stripe.String(""),
		AutomaticPaymentMethods: &stripe.SetupIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(false),
		},
		PaymentMethodTypes: []*string{stripe.String("card")},
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
