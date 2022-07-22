package infra

import (
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/templater/parser"
)

type InfraGetTemplateHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraGetTemplateHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraGetTemplateHandler {
	return &InfraGetTemplateHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraGetTemplateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	_, reqErr := requestutils.GetURLParamString(r, types.URLParamTemplateVersion)

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	name, reqErr := requestutils.GetURLParamString(r, types.URLParamTemplateName)

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)

		return
	}

	nameLower := strings.ToLower(name)

	formYAML, err := parser.FormYAMLFromBytes(&parser.ClientConfigDefault{}, getFormBytesFromKind(name), "declared", "infra")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &types.InfraTemplate{
		InfraTemplateMeta: templateMap[nameLower],
		Form:              formYAML,
	}

	c.WriteResult(w, r, res)
}

func getFormBytesFromKind(kind string) []byte {
	formBytes := []byte(testForm)

	switch strings.ToLower(kind) {
	case "ecr":
		formBytes = []byte(ecrForm)
	case "rds":
		formBytes = []byte(rdsForm)
	case "s3":
		formBytes = []byte(s3Form)
	case "eks":
		formBytes = []byte(eksForm)
	case "gcr":
		formBytes = []byte(gcrForm)
	case "gar":
		formBytes = []byte(garForm)
	case "gke":
		formBytes = []byte(gkeForm)
	case "docr":
		formBytes = []byte(docrForm)
	case "doks":
		formBytes = []byte(doksForm)
	case "aks":
		formBytes = []byte(aksForm)
	case "acr":
		formBytes = []byte(acrForm)
	}

	return formBytes
}
