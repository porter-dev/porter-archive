package parser

import (
	"fmt"

	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/templater"
	"github.com/porter-dev/porter/internal/templater/utils"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/release"
	"k8s.io/client-go/dynamic"
	"sigs.k8s.io/yaml"

	td "github.com/porter-dev/porter/internal/templater/dynamic"
	th "github.com/porter-dev/porter/internal/templater/helm"
)

// TODO -- handle all continue statements, errors should at least be logged if not
// thrown

type ClientConfigDefault struct {
	DynamicClient dynamic.Interface

	HelmAgent   *helm.Agent
	HelmRelease *release.Release
	HelmChart   *chart.Chart
}

func FormYAMLFromBytes(def *ClientConfigDefault, bytes []byte) (*models.FormYAML, error) {
	form, err := unqueriedFormYAMLFromBytes(bytes)

	if err != nil {
		return nil, err
	}

	lookup := formToLookupTable(def, form)

	// merge data from lookup
	data := make(map[string]interface{})

	for _, lookupVal := range lookup {
		queryRes, err := lookupVal.TemplateReader.Read()

		if err != nil {
			continue
		}

		for queryResKey, queryResVal := range queryRes {
			fmt.Printf("PARSER: found value %s, %v\n", queryResKey, queryResVal)

			data[queryResKey] = queryResVal
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

// unqueriedFormYAMLFromBytes returns a FormYAML without values queries populated
func unqueriedFormYAMLFromBytes(bytes []byte) (*models.FormYAML, error) {
	// parse bytes into object
	form := &models.FormYAML{}

	err := yaml.Unmarshal(bytes, form)

	if err != nil {
		return nil, err
	}

	// populate all context fields, with default set to helm/values with no config
	parent := &models.FormContext{
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

type ContextConfig struct {
	FromType       string   // "live" or "declared"
	Capabilities   []string // "read", "write"
	TemplateReader templater.TemplateReader
	TemplateWriter templater.TemplateWriter
}

// create map[*FormContext]*ContextConfig
// assumes all contexts populated
func formToLookupTable(def *ClientConfigDefault, form *models.FormYAML) map[*models.FormContext]*ContextConfig {
	lookup := make(map[*models.FormContext]*ContextConfig)

	for i, tab := range form.Tabs {
		for j, section := range tab.Sections {
			for k, content := range section.Contents {
				if content.Context == nil {
					continue
				}

				if _, ok := lookup[content.Context]; !ok {
					lookup[content.Context] = formContextToContextConfig(def, content.Context)
				}

				fmt.Printf("PARSER: content value %v, variable %s\n", content.Value, content.Variable)

				if fmt.Sprintf("%v", content.Value) != "" {
					// TODO -- case on whether value is proper query string, if not resolve it to a
					// proper query string
					query, err := utils.NewQuery(
						fmt.Sprintf("tabs[%d].sections[%d].contents[%d]", i, j, k),
						fmt.Sprintf("%v", content.Value),
					)

					fmt.Printf(
						"PARSER: added query %s, %s\n",
						fmt.Sprintf("tabs[%d].sections[%d].contents[%d]", i, j, k),
						fmt.Sprintf("%v", content.Value),
					)

					if err != nil {
						continue
					}

					lookup[content.Context].TemplateReader.RegisterQuery(query)
				} else if content.Variable != "" {
					// if variable field set without value field set, make variable field into jsonpath
					// query
					query, err := utils.NewQuery(
						fmt.Sprintf("tabs[%d].sections[%d].contents[%d]", i, j, k),
						fmt.Sprintf("{ .%v }", content.Variable),
					)

					fmt.Printf(
						"PARSER: added query %s, %s\n",
						fmt.Sprintf("tabs[%d].sections[%d].contents[%d]", i, j, k),
						fmt.Sprintf("{ .%v }", content.Variable),
					)

					if err != nil {
						continue
					}

					lookup[content.Context].TemplateReader.RegisterQuery(query)
				}
			}
		}
	}

	return lookup
}

// TODO -- this needs to be able to construct new context configs based on
// configuration for each context, but right now just uses the default config
// for everything
func formContextToContextConfig(def *ClientConfigDefault, context *models.FormContext) *ContextConfig {
	res := &ContextConfig{}

	switch context.Type {
	case "helm/values":
		res.FromType = "declared"

		res.Capabilities = []string{"read", "write"}

		res.TemplateReader = &th.ValuesTemplateReader{
			Release: def.HelmRelease,
			Chart:   def.HelmChart,
		}

		relName := ""

		if def.HelmRelease != nil {
			relName = def.HelmRelease.Name
		}

		res.TemplateWriter = &th.ValuesTemplateWriter{
			Agent:       def.HelmAgent,
			Chart:       def.HelmChart,
			ReleaseName: relName,
		}
	case "helm/manifests":
		res.FromType = "live"

		res.Capabilities = []string{"read"}

		res.TemplateReader = &th.ManifestsTemplateReader{
			Release: def.HelmRelease,
		}
	case "cluster":
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
	default:
		return nil
	}

	return res
}
