package env_group

import (
	"fmt"
	"net/http"
	"strings"
	"sync"

	"sigs.k8s.io/yaml"

	"helm.sh/helm/v3/pkg/release"
	v1 "k8s.io/api/core/v1"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/stacks"
)

type CreateEnvGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateEnvGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateEnvGroupHandler {
	return &CreateEnvGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateEnvGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CreateEnvGroupRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	namespace := r.Context().Value(types.NamespaceScope).(string)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envGroup, err := envgroup.GetEnvGroup(agent, request.Name, namespace, 0)

	// if the environment group exists and has MetaVersion=1, throw an error
	if envGroup != nil && envGroup.MetaVersion == 1 {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("env group with that name already exists"),
			http.StatusNotFound,
		))

		return
	} else if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	}

	helmAgent, err := c.GetHelmAgent(r, cluster, namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	configMap, err := envgroup.CreateEnvGroup(agent, types.ConfigMapInput{
		Name:            request.Name,
		Namespace:       namespace,
		Variables:       request.Variables,
		SecretVariables: request.SecretVariables,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envGroup, err = envgroup.ToEnvGroup(configMap)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	releases, err := envgroup.GetSyncedReleases(helmAgent, configMap)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := &types.V1EnvGroupResponse{
		CreatedAt: envGroup.CreatedAt,
		Version:   envGroup.Version,
		Name:      envGroup.Name,
		Releases:  envGroup.Applications,
		Variables: envGroup.Variables,
	}

	stackId, err := stacks.GetStackForEnvGroup(c.Config(), cluster.ProjectID, cluster.ID, envGroup)

	if err == nil && len(stackId) > 0 {
		res.StackID = stackId
	}

	c.WriteResult(w, r, res)

	// trigger rollout of new applications after writing the result
	errors := rolloutApplications(c.Config(), cluster, helmAgent, envGroup, configMap, releases)

	if len(errors) > 0 {
		errStrArr := make([]string, 0)

		for _, err := range errors {
			errStrArr = append(errStrArr, err.Error())
		}

		c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(fmt.Errorf(strings.Join(errStrArr, ","))))
		return
	}

	err = postUpgrade(c.Config(), cluster.ProjectID, cluster.ID, envGroup)

	if err != nil {
		c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
		return
	}
}

func rolloutApplications(
	config *config.Config,
	cluster *models.Cluster,
	helmAgent *helm.Agent,
	envGroup *types.EnvGroup,
	configMap *v1.ConfigMap,
	releases []*release.Release,
) []error {
	registries, err := config.Repo.Registry().ListRegistriesByProjectID(cluster.ProjectID)

	if err != nil {
		return []error{err}
	}

	// construct the synced env section that should be written
	newSection := &SyncedEnvSection{
		Name:    envGroup.Name,
		Version: envGroup.Version,
	}

	newSectionKeys := make([]SyncedEnvSectionKey, 0)

	for key, val := range configMap.Data {
		newSectionKeys = append(newSectionKeys, SyncedEnvSectionKey{
			Name:   key,
			Secret: strings.Contains(val, "PORTERSECRET"),
		})
	}

	newSection.Keys = newSectionKeys

	// asynchronously update releases with that image repo uri
	var wg sync.WaitGroup
	mu := &sync.Mutex{}
	errors := make([]error, 0)

	for i, rel := range releases {
		index := i
		release := rel
		wg.Add(1)

		go func() {
			defer wg.Done()
			// read release via agent
			newConfig, err := getNewConfig(release.Config, newSection)

			if err != nil {
				mu.Lock()
				errors = append(errors, err)
				mu.Unlock()
				return
			}

			// if this is a job chart, update the config and set correct paused param to true
			if release.Chart.Name() == "job" {
				newConfig["paused"] = true
			}

			conf := &helm.UpgradeReleaseConfig{
				Name:       releases[index].Name,
				Cluster:    cluster,
				Repo:       config.Repo,
				Registries: registries,
				Values:     newConfig,
			}

			_, err = helmAgent.UpgradeReleaseByValues(conf, config.DOConf, config.ServerConf.DisablePullSecretsInjection)

			if err != nil {
				mu.Lock()
				errors = append(errors, err)
				mu.Unlock()
				return
			}
		}()
	}

	wg.Wait()

	return errors
}

type SyncedEnvSection struct {
	Name    string                `json:"name" yaml:"name"`
	Version uint                  `json:"version" yaml:"version"`
	Keys    []SyncedEnvSectionKey `json:"keys" yaml:"keys"`
}

type SyncedEnvSectionKey struct {
	Name   string `json:"name" yaml:"name"`
	Secret bool   `json:"secret" yaml:"secret"`
}

func getNewConfig(curr map[string]interface{}, syncedEnvSection *SyncedEnvSection) (map[string]interface{}, error) {
	// look for container.env.synced
	envConf, err := getNestedMap(curr, "container", "env")

	if err != nil {
		return nil, err
	}

	syncedEnvInter, syncedEnvExists := envConf["synced"]

	if !syncedEnvExists {
		return curr, nil
	} else {
		syncedArr := make([]*SyncedEnvSection, 0)
		syncedArrInter, ok := syncedEnvInter.([]interface{})

		if !ok {
			return nil, fmt.Errorf("could not convert to synced env section: not an array")
		}

		for _, syncedArrInterObj := range syncedArrInter {
			syncedArrObj := &SyncedEnvSection{}
			syncedArrInterObjMap, ok := syncedArrInterObj.(map[string]interface{})

			if !ok {
				continue
			}

			if nameField, nameFieldExists := syncedArrInterObjMap["name"]; nameFieldExists {
				syncedArrObj.Name, ok = nameField.(string)

				if !ok {
					continue
				}
			}

			if versionField, versionFieldExists := syncedArrInterObjMap["version"]; versionFieldExists {
				versionFloat, ok := versionField.(float64)

				if !ok {
					continue
				}

				syncedArrObj.Version = uint(versionFloat)
			}

			if keyField, keyFieldExists := syncedArrInterObjMap["keys"]; keyFieldExists {
				keyFieldInterArr, ok := keyField.([]interface{})

				if !ok {
					continue
				}

				keyFieldMapArr := make([]map[string]interface{}, 0)

				for _, keyFieldInter := range keyFieldInterArr {
					mapConv, ok := keyFieldInter.(map[string]interface{})

					if !ok {
						continue
					}

					keyFieldMapArr = append(keyFieldMapArr, mapConv)
				}

				keyFieldRes := make([]SyncedEnvSectionKey, 0)

				for _, keyFieldMap := range keyFieldMapArr {
					toAdd := SyncedEnvSectionKey{}

					if nameField, nameFieldExists := keyFieldMap["name"]; nameFieldExists {
						toAdd.Name, ok = nameField.(string)

						if !ok {
							continue
						}
					}

					if secretField, secretFieldExists := keyFieldMap["secret"]; secretFieldExists {
						toAdd.Secret, ok = secretField.(bool)

						if !ok {
							continue
						}
					}

					keyFieldRes = append(keyFieldRes, toAdd)
				}

				syncedArrObj.Keys = keyFieldRes
			}

			syncedArr = append(syncedArr, syncedArrObj)
		}

		resArr := make([]SyncedEnvSection, 0)
		foundMatch := false

		for _, candidate := range syncedArr {
			if candidate.Name == syncedEnvSection.Name {
				resArr = append(resArr, *syncedEnvSection)
				foundMatch = true
			} else {
				resArr = append(resArr, *candidate)
			}
		}

		if !foundMatch {
			return curr, nil
		}

		envConf["synced"] = resArr
	}

	// to remove all types that Helm may not be able to work with, we marshal to and from
	// yaml for good measure. Otherwise we get silly error messages like:
	// Upgrade failed: template: web/templates/deployment.yaml:138:40: executing \"web/templates/deployment.yaml\"
	// at <$syncedEnv.keys>: can't evaluate field keys in type namespace.SyncedEnvSection
	currYAML, err := yaml.Marshal(curr)

	if err != nil {
		return nil, err
	}

	res := make(map[string]interface{})

	err = yaml.Unmarshal([]byte(currYAML), &res)

	if err != nil {
		return nil, err
	}

	return res, nil
}

func getNestedMap(obj map[string]interface{}, fields ...string) (map[string]interface{}, error) {
	var res map[string]interface{}
	curr := obj

	for _, field := range fields {
		objField, ok := curr[field]

		if !ok {
			return nil, fmt.Errorf("%s not found", field)
		}

		res, ok = objField.(map[string]interface{})

		if !ok {
			return nil, fmt.Errorf("%s is not a nested object", field)
		}

		curr = res
	}

	return res, nil
}

// postUpgrade runs any necessary scripting after the release has been upgraded.
func postUpgrade(config *config.Config, projectID, clusterID uint, envGroup *types.EnvGroup) error {
	// update the relevant env group version number if tied to a stack resource
	return stacks.UpdateEnvGroupVersion(config, projectID, clusterID, envGroup)
}
