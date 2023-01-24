package saml

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/saml"
	"gorm.io/gorm"
)

type CreateSAMLIntegrationHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateSAMLIntegrationHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateSAMLIntegrationHandler {
	return &CreateSAMLIntegrationHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (h *CreateSAMLIntegrationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	if !project.SAMLSSOEnabled {
		h.HandleAPIError(w, r, apierrors.NewErrForbidden(errors.New("SAML SSO is not enabled for this project")))
		return
	}

	// FIXME: check if user has necessary permissions to make this request with RBAC

	request := &types.CreateSAMLIntegrationRequest{}

	if ok := h.DecodeAndValidate(w, r, request); !ok {
		return
	}

	for _, domain := range request.Domains {
		parsed, err := url.Parse("https://" + domain)

		if err != nil || parsed.Host != domain {
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("invalid domain %s", domain),
				http.StatusBadRequest))
			return
		}

		_, err = h.Repo().SAMLIntegration().ValidateSAMLIntegration(domain)

		if err == nil {
			h.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("domain %s already exists in another SAML integration, please talk to the Porter team for help",
					domain), http.StatusBadRequest))
			return
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			h.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	integ := &saml.SAMLIntegration{
		ProjectID:       project.ID,
		Domains:         strings.Join(request.Domains, ","),
		SignOnURL:       request.SignOnURL,
		CertificateData: request.CertificateData,
	}

	if _, err := h.Repo().SAMLIntegration().CreateSAMLIntegration(integ); err != nil {
		h.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
