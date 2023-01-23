package saml

import (
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type ValidateSAMLHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewValidateSAMLHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ValidateSAMLHandler {
	return &ValidateSAMLHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (h *ValidateSAMLHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.ValidateSAMLRequest{}

	if ok := h.DecodeAndValidate(w, r, request); !ok {
		return
	}

	addr, err := mail.ParseAddress(request.Email)

	if err != nil {
		h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("invalid email address"), http.StatusBadRequest))
		return
	}

	domain := addr.Address[strings.Index(addr.Address, "@")+1:]

	integ, err := h.Repo().SAMLIntegration().ValidateSAMLIntegration(domain)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			h.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no SAML integration found for this email")))
			return
		}

		h.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	http.Redirect(w, r, integ.SignOnURL, http.StatusFound)
}
