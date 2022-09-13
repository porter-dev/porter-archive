package opa

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/mitchellh/mapstructure"
	"github.com/open-policy-agent/opa/rego"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/pkg/logger"
	"helm.sh/helm/v3/pkg/release"
	"k8s.io/apimachinery/pkg/runtime"
)

type KubernetesPolicies struct {
	Policies map[string]KubernetesOPAQueryCollection
}

type KubernetesOPARunner struct {
	*KubernetesPolicies

	k8sAgent *kubernetes.Agent
}

type KubernetesBuiltInKind string

const (
	HelmRelease KubernetesBuiltInKind = "helm_release"
	Pod         KubernetesBuiltInKind = "pod"
)

type KubernetesOPAQueryCollection struct {
	Kind    KubernetesBuiltInKind
	Match   MatchParameters
	Queries []rego.PreparedEvalQuery
}

type MatchParameters struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`

	ChartName string `json:"chart_name"`

	Labels map[string]string `json:"labels"`
}

type OPARecommenderQueryResult struct {
	Allow bool `mapstructure:"Allow"`

	CategoryName string
	ObjectID     string

	PolicyVersion  string `mapstructure:"POLICY_VERSION"`
	PolicySeverity string `mapstructure:"POLICY_SEVERITY"`
	PolicyTitle    string `mapstructure:"POLICY_TITLE"`
	PolicyMessage  string `mapstructure:"POLICY_MESSAGE"`
}

func NewRunner(policies *KubernetesPolicies, k8sAgent *kubernetes.Agent) *KubernetesOPARunner {
	return &KubernetesOPARunner{policies, k8sAgent}
}

func (runner *KubernetesOPARunner) GetRecommendationsByName(name string) ([]*OPARecommenderQueryResult, error) {
	// look up to determine if the name is registered
	queryCollection, exists := runner.Policies[name]

	if !exists {
		return nil, fmt.Errorf("No policies for %s found", name)
	}

	switch queryCollection.Kind {
	case HelmRelease:
		return runner.runHelmReleaseQueries(name, queryCollection)
	case Pod:
		return runner.runPodQueries(name, queryCollection)
	default:
		return nil, fmt.Errorf("Not a supported query kind")
	}
}

func (runner *KubernetesOPARunner) SetK8sAgent(k8sAgent *kubernetes.Agent) {
	runner.k8sAgent = k8sAgent
}

func (runner *KubernetesOPARunner) runHelmReleaseQueries(name string, collection KubernetesOPAQueryCollection) ([]*OPARecommenderQueryResult, error) {
	res := make([]*OPARecommenderQueryResult, 0)

	helmAgent, err := helm.GetAgentFromK8sAgent("secret", collection.Match.Namespace, logger.New(false, os.Stdout), runner.k8sAgent)

	if err != nil {
		return nil, err
	}

	// get the matching helm release(s) based on the match
	var helmReleases []*release.Release

	if collection.Match.Name != "" {
		helmRelease, err := helmAgent.GetRelease(collection.Match.Name, 0, false)

		if err != nil {
			return nil, err
		}

		helmReleases = append(helmReleases, helmRelease)
	} else if collection.Match.ChartName != "" {
		prefilterReleases, err := helmAgent.ListReleases(collection.Match.Namespace, &types.ReleaseListFilter{
			ByDate: true,
			StatusFilter: []string{
				"deployed",
				"pending",
				"pending-install",
				"pending-upgrade",
				"pending-rollback",
				"failed",
			},
		})

		if err != nil {
			return nil, err
		}

		for _, prefilterRelease := range prefilterReleases {
			if prefilterRelease.Chart.Name() == collection.Match.ChartName {
				helmReleases = append(helmReleases, prefilterRelease)
			}
		}
	} else {
		return nil, fmt.Errorf("invalid match parameters")
	}

	for _, helmRelease := range helmReleases {
		for _, query := range collection.Queries {
			results, err := query.Eval(
				context.Background(),
				rego.EvalInput(map[string]interface{}{
					"version": helmRelease.Chart.Metadata.Version,
					"values":  helmRelease.Config,
				}),
			)

			if err != nil {
				return nil, err
			}

			if len(results) == 1 {
				queryRes := &OPARecommenderQueryResult{
					ObjectID:     fmt.Sprintf("helm_release/%s/%s", helmRelease.Namespace, helmRelease.Name),
					CategoryName: name,
				}

				err = mapstructure.Decode(results[0].Expressions[0].Value, queryRes)

				if err != nil {
					return nil, err
				}

				res = append(res, queryRes)
			}
		}
	}

	return res, nil
}

func (runner *KubernetesOPARunner) runPodQueries(name string, collection KubernetesOPAQueryCollection) ([]*OPARecommenderQueryResult, error) {
	res := make([]*OPARecommenderQueryResult, 0)

	lselArr := make([]string, 0)

	for k, v := range collection.Match.Labels {
		lselArr = append(lselArr, fmt.Sprintf("%s=%s", k, v))
	}

	lsel := strings.Join(lselArr, ",")

	pods, err := runner.k8sAgent.GetPodsByLabel(lsel, collection.Match.Namespace)

	if err != nil {
		return nil, err
	}

	for _, pod := range pods.Items {
		unstructuredPod, err := runtime.DefaultUnstructuredConverter.ToUnstructured(&pod)

		if err != nil {
			return nil, err
		}

		for _, query := range collection.Queries {
			results, err := query.Eval(
				context.Background(),
				rego.EvalInput(unstructuredPod),
			)

			if err != nil {
				return nil, err
			}

			if len(results) == 1 {
				queryRes := &OPARecommenderQueryResult{
					ObjectID:     fmt.Sprintf("pod/%s/%s", pod.Namespace, pod.Name),
					CategoryName: name,
				}

				err = mapstructure.Decode(results[0].Expressions[0].Value, queryRes)

				if err != nil {
					return nil, err
				}

				res = append(res, queryRes)
			}
		}
	}

	return res, nil
}
