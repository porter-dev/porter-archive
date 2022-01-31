package infra

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"

	"sigs.k8s.io/yaml"
)

type InfraListTemplateHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraListTemplateHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraListTemplateHandler {
	return &InfraListTemplateHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraListTemplateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	testFormData := make(map[string]interface{})

	err := yaml.Unmarshal([]byte(testForm), &testFormData)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := []types.InfraTemplate{
		{
			Icon:               "",
			Description:        "Create an test resource.",
			Name:               "Test",
			Version:            "v0.1.0",
			Kind:               "test",
			Form:               testFormData,
			RequiredCredential: "aws_integration_id",
		},
	}

	c.WriteResult(w, r, res)
}

const testForm = `name: Test
hasSource: false
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: String to echo
    - type: string-input
      variable: echo
      value: 
      - "hello"
`
