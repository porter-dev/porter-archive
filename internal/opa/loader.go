package opa

import (
	"context"
	"fmt"
	"io/ioutil"
	"path/filepath"

	"github.com/open-policy-agent/opa/rego"
	"sigs.k8s.io/yaml"
)

type ConfigFile map[string]ConfigFilePolicyCollection

type ConfigFilePolicyCollection struct {
	Kind             string             `json:"kind"`
	Match            MatchParameters    `json:"match"`
	MustExist        bool               `json:"mustExist"`
	OverrideSeverity string             `json:"override_severity"`
	Policies         []ConfigFilePolicy `json:"policies"`
}

type ConfigFilePolicy struct {
	Path string
	Name string
}

func LoadPolicies(configFilePathDir string) (*KubernetesPolicies, error) {
	// read and parse the config file
	fileBytes, err := ioutil.ReadFile(filepath.Join(configFilePathDir, "config.yaml"))

	if err != nil {
		return nil, err
	}

	configFile := make(map[string]ConfigFilePolicyCollection)

	err = yaml.Unmarshal(fileBytes, &configFile)

	if err != nil {
		return nil, err
	}

	// load each map entry
	policies := make(map[string]KubernetesOPAQueryCollection)

	for name, cfPolicyCollection := range configFile {
		queries := make([]rego.PreparedEvalQuery, 0)

		for _, cfPolicy := range cfPolicyCollection.Policies {
			fileBytes, err := ioutil.ReadFile(filepath.Join(configFilePathDir, cfPolicy.Path))

			if err != nil {
				return nil, err
			}

			query, err := rego.New(
				rego.Query(fmt.Sprintf("data.%s", cfPolicy.Name)),
				rego.Module(cfPolicy.Name, string(fileBytes)),
			).PrepareForEval(context.Background())

			if err != nil {
				// Handle error.
				return nil, err
			}

			queries = append(queries, query)
		}

		policies[name] = KubernetesOPAQueryCollection{
			Kind:             KubernetesBuiltInKind(cfPolicyCollection.Kind),
			Queries:          queries,
			Match:            cfPolicyCollection.Match,
			OverrideSeverity: cfPolicyCollection.OverrideSeverity,
			MustExist:        cfPolicyCollection.MustExist,
		}
	}

	return &KubernetesPolicies{
		Policies: policies,
	}, nil
}
