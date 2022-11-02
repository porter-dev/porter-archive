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
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/pkg/logger"
	"helm.sh/helm/v3/pkg/release"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

type KubernetesPolicies struct {
	Policies map[string]KubernetesOPAQueryCollection
}

type KubernetesOPARunner struct {
	*KubernetesPolicies

	cluster       *models.Cluster
	k8sAgent      *kubernetes.Agent
	dynamicClient dynamic.Interface
}

type KubernetesBuiltInKind string

const (
	HelmRelease KubernetesBuiltInKind = "helm_release"
	Pod         KubernetesBuiltInKind = "pod"
	CRDList     KubernetesBuiltInKind = "crd_list"
	Daemonset   KubernetesBuiltInKind = "daemonset"
)

type KubernetesOPAQueryCollection struct {
	Kind             KubernetesBuiltInKind
	Match            MatchParameters
	MustExist        bool
	OverrideSeverity string
	Queries          []rego.PreparedEvalQuery
}

type MatchParameters struct {
	// global cluster match parameters

	// KubernetesService is a matching service kind, like `eks`
	KubernetesService string `json:"kubernetes_service"`

	// parameters for Helm releases
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	ChartName string `json:"chart_name"`

	// generic labels parameter
	Labels map[string]string `json:"labels"`

	// parameters for CRDs
	Group    string `json:"group"`
	Version  string `json:"version"`
	Resource string `json:"resource"`
}

type OPARecommenderQueryResult struct {
	Allow bool

	CategoryName string
	ObjectID     string

	PolicyVersion  string
	PolicySeverity string
	PolicyTitle    string
	PolicyMessage  string
}

type rawQueryResult struct {
	Allow          bool   `mapstructure:"ALLOW"`
	PolicyID       string `mapstructure:"POLICY_ID"`
	PolicyVersion  string `mapstructure:"POLICY_VERSION"`
	PolicySeverity string `mapstructure:"POLICY_SEVERITY"`
	PolicyTitle    string `mapstructure:"POLICY_TITLE"`
	SuccessMessage string `mapstructure:"POLICY_SUCCESS_MESSAGE"`

	FailureMessage []string `mapstructure:"FAILURE_MESSAGE"`
}

func NewRunner(policies *KubernetesPolicies, cluster *models.Cluster, k8sAgent *kubernetes.Agent, dynamicClient dynamic.Interface) *KubernetesOPARunner {
	return &KubernetesOPARunner{policies, cluster, k8sAgent, dynamicClient}
}

func (runner *KubernetesOPARunner) GetRecommendations(categories []string) ([]*OPARecommenderQueryResult, error) {
	collectionNames := categories

	if len(categories) == 0 {
		for catName, _ := range runner.Policies {
			collectionNames = append(collectionNames, catName)
		}
	}

	res := make([]*OPARecommenderQueryResult, 0)

	// ping the cluster with a version check to make sure it's reachable - if not, return an error
	_, err := runner.k8sAgent.Clientset.Discovery().ServerVersion()

	if err != nil {
		fmt.Printf("discovery check failed: %v\n", err.Error())
	} else {
		for _, name := range collectionNames {
			// look up to determine if the name is registered
			queryCollection, exists := runner.Policies[name]

			if !exists {
				return nil, fmt.Errorf("No policies for %s found", name)
			}

			var currResults []*OPARecommenderQueryResult
			var err error

			// look at global match parameters
			if s := queryCollection.Match.KubernetesService; s != "" && strings.ToLower(string(runner.cluster.ToClusterType().Service)) != s {
				fmt.Printf("skipping %s as it does not match the cluster service", name)
				continue
			}

			switch queryCollection.Kind {
			case HelmRelease:
				currResults, err = runner.runHelmReleaseQueries(name, queryCollection)
			case Pod:
				currResults, err = runner.runPodQueries(name, queryCollection)
			case CRDList:
				currResults, err = runner.runCRDListQueries(name, queryCollection)
			case Daemonset:
				currResults, err = runner.runDaemonsetQueries(name, queryCollection)
			default:
				fmt.Printf("%s is not a supported query kind", queryCollection.Kind)
				continue
			}

			if err != nil {
				fmt.Printf("%s", err.Error())
				continue
			}

			res = append(res, currResults...)
		}
	}

	return res, nil
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
			if collection.MustExist && strings.Contains(err.Error(), "not found") {
				return []*OPARecommenderQueryResult{
					{
						Allow:          false,
						ObjectID:       fmt.Sprintf("helm_release/%s/%s/%s", collection.Match.Namespace, collection.Match.Name, "exists"),
						CategoryName:   name,
						PolicyVersion:  "v0.0.1",
						PolicySeverity: getSeverity("high", collection),
						PolicyTitle:    fmt.Sprintf("The helm release %s must exist", collection.Match.Name),
						PolicyMessage:  "The helm release was not found on the cluster",
					},
				}, nil
			} else {
				return nil, err
			}
		} else if collection.MustExist {
			res = append(res, &OPARecommenderQueryResult{
				Allow:          true,
				ObjectID:       fmt.Sprintf("helm_release/%s/%s/%s", collection.Match.Namespace, collection.Match.Name, "exists"),
				CategoryName:   name,
				PolicyVersion:  "v0.0.1",
				PolicySeverity: getSeverity("high", collection),
				PolicyTitle:    fmt.Sprintf("The helm release %s must exist", collection.Match.Name),
				PolicyMessage:  "The helm release was found",
			})
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
					"version":   helmRelease.Chart.Metadata.Version,
					"values":    helmRelease.Config,
					"name":      helmRelease.Name,
					"namespace": helmRelease.Namespace,
				}),
			)

			if err != nil {
				return nil, err
			}

			if len(results) == 1 {
				rawQueryRes := &rawQueryResult{}

				err = mapstructure.Decode(results[0].Expressions[0].Value, rawQueryRes)

				if err != nil {
					return nil, err
				}

				res = append(res, rawQueryResToRecommenderQueryResult(
					rawQueryRes,
					fmt.Sprintf("helm_release/%s/%s/%s", helmRelease.Namespace, helmRelease.Name, rawQueryRes.PolicyID),
					name,
					collection,
				))
			}
		}
	}

	return res, nil
}

func getSeverity(defaultSeverity string, collection KubernetesOPAQueryCollection) string {
	if collection.OverrideSeverity != "" {
		return collection.OverrideSeverity
	}

	return defaultSeverity
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
				rawQueryRes := &rawQueryResult{}

				err = mapstructure.Decode(results[0].Expressions[0].Value, rawQueryRes)

				if err != nil {
					return nil, err
				}

				res = append(res, rawQueryResToRecommenderQueryResult(
					rawQueryRes,
					fmt.Sprintf("pod/%s/%s", pod.Namespace, pod.Name),
					name,
					collection,
				))
			}
		}
	}

	return res, nil
}

func (runner *KubernetesOPARunner) runDaemonsetQueries(name string, collection KubernetesOPAQueryCollection) ([]*OPARecommenderQueryResult, error) {
	res := make([]*OPARecommenderQueryResult, 0)

	lselArr := make([]string, 0)

	for k, v := range collection.Match.Labels {
		lselArr = append(lselArr, fmt.Sprintf("%s=%s", k, v))
	}

	lsel := strings.Join(lselArr, ",")

	daemonsets, err := runner.k8sAgent.Clientset.AppsV1().DaemonSets(collection.Match.Namespace).List(context.Background(), v1.ListOptions{
		LabelSelector: lsel,
	})

	if err != nil {
		return nil, err
	}

	for _, ds := range daemonsets.Items {
		unstructuredDS, err := runtime.DefaultUnstructuredConverter.ToUnstructured(&ds)

		if err != nil {
			return nil, err
		}

		for _, query := range collection.Queries {
			results, err := query.Eval(
				context.Background(),
				rego.EvalInput(unstructuredDS),
			)

			if err != nil {
				return nil, err
			}

			if len(results) == 1 {
				rawQueryRes := &rawQueryResult{}

				err = mapstructure.Decode(results[0].Expressions[0].Value, rawQueryRes)

				if err != nil {
					return nil, err
				}

				res = append(res, rawQueryResToRecommenderQueryResult(
					rawQueryRes,
					fmt.Sprintf("daemonset/%s/%s", ds.Namespace, ds.Name),
					name,
					collection,
				))
			}
		}
	}

	return res, nil
}

func (runner *KubernetesOPARunner) runCRDListQueries(name string, collection KubernetesOPAQueryCollection) ([]*OPARecommenderQueryResult, error) {
	res := make([]*OPARecommenderQueryResult, 0)

	objRes := schema.GroupVersionResource{
		Group:    collection.Match.Group,
		Version:  collection.Match.Version,
		Resource: collection.Match.Resource,
	}

	// just case on the "core" group and unset it
	if collection.Match.Group == "core" {
		objRes.Group = ""
	}

	crdList, err := runner.dynamicClient.Resource(objRes).Namespace(collection.Match.Namespace).List(context.Background(), v1.ListOptions{})

	if err != nil {
		return nil, err
	}

	for _, crd := range crdList.Items {
		for _, query := range collection.Queries {
			results, err := query.Eval(
				context.Background(),
				rego.EvalInput(crd.Object),
			)

			if err != nil {
				return nil, err
			}

			if len(results) == 1 {
				rawQueryRes := &rawQueryResult{}

				err = mapstructure.Decode(results[0].Expressions[0].Value, rawQueryRes)

				if err != nil {
					return nil, err
				}

				res = append(res, rawQueryResToRecommenderQueryResult(
					rawQueryRes,
					fmt.Sprintf("%s/%s/%s/%s", collection.Match.Group, collection.Match.Version, collection.Match.Resource, rawQueryRes.PolicyID),
					name,
					collection,
				))
			}
		}
	}

	return res, nil
}

func rawQueryResToRecommenderQueryResult(rawQueryRes *rawQueryResult, objectID, categoryName string, collection KubernetesOPAQueryCollection) *OPARecommenderQueryResult {
	queryRes := &OPARecommenderQueryResult{
		ObjectID:     objectID,
		CategoryName: categoryName,
	}

	message := rawQueryRes.SuccessMessage

	// if failure, compose failure messages into single string
	if !rawQueryRes.Allow {
		message = strings.Join(rawQueryRes.FailureMessage, ". ")
	}

	queryRes.PolicyMessage = message
	queryRes.Allow = rawQueryRes.Allow
	queryRes.PolicySeverity = getSeverity(rawQueryRes.PolicySeverity, collection)
	queryRes.PolicyTitle = rawQueryRes.PolicyTitle
	queryRes.PolicyVersion = rawQueryRes.PolicyVersion

	return queryRes
}
