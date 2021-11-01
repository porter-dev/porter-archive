package parser

import (
	"fmt"
	"strings"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/templater"
	"github.com/porter-dev/porter/internal/templater/utils"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/release"
	"k8s.io/client-go/dynamic"
	"sigs.k8s.io/yaml"

	td "github.com/porter-dev/porter/internal/templater/dynamic"
	tm "github.com/porter-dev/porter/internal/templater/helm/manifests"
	tv "github.com/porter-dev/porter/internal/templater/helm/values"
)

// ClientConfigDefault is a set of default clients to be used if a context in
// form.yaml does not declare otherwise.
type ClientConfigDefault struct {
	DynamicClient dynamic.Interface

	HelmAgent   *helm.Agent
	HelmRelease *release.Release
	HelmChart   *chart.Chart
}

// ContextConfig can read/write from a specified context (data source)
type ContextConfig struct {
	FromType       string   // "live" or "declared"
	Capabilities   []string // "read", "write"
	TemplateReader templater.TemplateReader
	TemplateWriter templater.TemplateWriter
}

// GetFormFromRelease returns the form by parsing a release's files. Returns nil if
// the form is not found, throws an error if the form was found but there was a parsing
// error.
func GetFormFromRelease(def *ClientConfigDefault, rel *release.Release) (*types.FormYAML, error) {
	for _, file := range rel.Chart.Files {
		if strings.Contains(file.Name, "form.yaml") {
			return FormYAMLFromBytes(def, file.Data, "")
		}
	}

	return nil, nil
}

// FormYAMLFromBytes generates a usable form yaml from raw form config and a
// set of default clients.
//
// stateType refers to the types of state that should be read. The two state types
// are "live" and "declared" -- if stateType is "", this will read both live and
// declared states.
func FormYAMLFromBytes(def *ClientConfigDefault, bytes []byte, stateType string) (*types.FormYAML, error) {
	form, err := unqueriedFormYAMLFromBytes(bytes)

	if err != nil {
		return nil, err
	}

	lookup := formToLookupTable(def, form, stateType)

	// merge data from lookup
	data := make(map[string]interface{})

	for _, lookupVal := range lookup {
		if lookupVal != nil {
			queryRes, err := lookupVal.TemplateReader.Read()

			if err != nil {
				continue
			}

			for queryResKey, queryResVal := range queryRes {
				data[queryResKey] = queryResVal
			}
		}
	}

	for i, tab := range form.Tabs {
		for j, section := range tab.Sections {
			for k, content := range section.Contents {
				key := fmt.Sprintf("tabs[%d].sections[%d].contents[%d]", i, j, k)

				if val, ok := data[key]; ok {
					content.Value = val
				}
			}
		}
	}

	return form, nil
}

func FormStreamer(
	def *ClientConfigDefault,
	bytes []byte,
	stateType string,
	targetContext *types.FormContext,
	on templater.OnDataStream,
	stopCh <-chan struct{},
) error {

	fmt.Println("HERE -2")

	form, err := unqueriedFormYAMLFromBytes(bytes)
	fmt.Println("HERE -1", form, err)

	if err != nil {
		return err
	}

	lookup := formToLookupTable(def, form, stateType)
	fmt.Println("HERE -0.5", lookup)

	for lookupContext, lookupVal := range lookup {
		fmt.Println("HERE 0")
		if lookupVal != nil && areContextsEqual(targetContext, lookupContext) {
			fmt.Println("HERE 1")
			err := lookupVal.TemplateReader.ReadStream(on, stopCh)

			fmt.Println("HERE 2", err)

			if err != nil {
				continue
			}
		}
	}

	return nil
}

func areContextsEqual(context1, context2 *types.FormContext) bool {
	if context1.Type != context2.Type {
		return false
	}

	subset12 := isSubset(context1.Config, context2.Config)
	subset21 := isSubset(context2.Config, context1.Config)

	return subset12 && subset21
}

func isSubset(map1, map2 map[string]string) bool {
	subset12 := true

	for key1, val1 := range map1 {
		if val2, exists := map2[key1]; !exists || val2 != val1 {
			subset12 = false
			break
		}
	}

	return subset12
}

// unqueriedFormYAMLFromBytes returns a FormYAML without values queries populated
func unqueriedFormYAMLFromBytes(bytes []byte) (*types.FormYAML, error) {
	// parse bytes into object
	form := &types.FormYAML{}

	err := yaml.Unmarshal(bytes, form)

	if err != nil {
		return nil, err
	}

	// populate all context fields, with default set to helm/values with no config
	parent := &types.FormContext{
		Type: "helm/values",
	}

	for _, tab := range form.Tabs {
		if tab.Context == nil {
			tab.Context = parent
		}

		for _, section := range tab.Sections {
			if section.Context == nil {
				section.Context = tab.Context
			}

			for _, content := range section.Contents {
				if content.Context == nil {
					content.Context = section.Context
				}
			}
		}
	}

	return form, nil
}

// create map[*FormContext]*ContextConfig
// assumes all contexts populated
func formToLookupTable(def *ClientConfigDefault, form *types.FormYAML, stateType string) map[*types.FormContext]*ContextConfig {
	lookup := make(map[*types.FormContext]*ContextConfig)

	for i, tab := range form.Tabs {
		for j, section := range tab.Sections {
			for k, content := range section.Contents {
				if content.Context == nil {
					continue
				}

				if _, ok := lookup[content.Context]; !ok {
					lookup[content.Context] = formContextToContextConfig(def, content.Context, stateType)
				}

				if lookup[content.Context] == nil {
					continue
				}

				if content.Value != nil && fmt.Sprintf("%v", content.Value) != "" {
					// TODO -- case on whether value is proper query string, if not resolve it to a
					// proper query string
					query, err := utils.NewQuery(
						fmt.Sprintf("tabs[%d].sections[%d].contents[%d]", i, j, k),
						fmt.Sprintf("%v", content.Value),
					)

					if err != nil {
						continue
					}

					if stateType == "" || stateType == lookup[content.Context].FromType {
						lookup[content.Context].TemplateReader.RegisterQuery(query)
					}
				} else if content.Variable != "" {
					// if variable field set without value field set, make variable field into jsonpath
					// query
					query, err := utils.NewQuery(
						fmt.Sprintf("tabs[%d].sections[%d].contents[%d]", i, j, k),
						fmt.Sprintf(".%v", content.Variable),
					)

					if err != nil {
						continue
					}

					if stateType == "" || stateType == lookup[content.Context].FromType {
						lookup[content.Context].TemplateReader.RegisterQuery(query)
					}
				}
			}
		}
	}

	return lookup
}

// TODO -- this needs to be able to construct new context configs based on
// configuration for each context, but right now just uses the default config
// for everything
func formContextToContextConfig(def *ClientConfigDefault, context *types.FormContext, stateType string) *ContextConfig {
	res := &ContextConfig{}

	if context.Type == "helm/values" && (stateType == "" || stateType == "declared") {
		res.FromType = "declared"

		res.Capabilities = []string{"read", "write"}

		res.TemplateReader = &tv.TemplateReader{
			Release: def.HelmRelease,
			Chart:   def.HelmChart,
		}

		relName := ""

		if def.HelmRelease != nil {
			relName = def.HelmRelease.Name
		}

		res.TemplateWriter = &tv.TemplateWriter{
			Agent:       def.HelmAgent,
			Chart:       def.HelmChart,
			ReleaseName: relName,
		}
	} else if context.Type == "helm/manifests" && (stateType == "" || stateType == "live") {
		res.FromType = "live"

		res.Capabilities = []string{"read"}

		res.TemplateReader = &tm.TemplateReader{
			Release: def.HelmRelease,
		}
	} else if context.Type == "cluster" && (stateType == "" || stateType == "live") {
		res.FromType = "live"

		res.Capabilities = []string{"read"}

		// identify object based on passed config
		obj := &td.Object{
			Group:     context.Config["group"],
			Version:   context.Config["version"],
			Resource:  context.Config["resource"],
			Namespace: context.Config["namespace"],
			Name:      context.Config["name"],
		}

		res.TemplateReader = td.NewDynamicTemplateReader(def.DynamicClient, obj)
	} else {
		return nil
	}

	return res
}
