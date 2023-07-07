package namespace

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"sigs.k8s.io/yaml"

	"github.com/google/uuid"
	"github.com/stefanmcshane/helm/pkg/release"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
	"github.com/stefanmcshane/helm/pkg/chart"
)

type CreateStacksEnvGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateStacksEnvGroupHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateStacksEnvGroupHandler {
	return &CreateStacksEnvGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateStacksEnvGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CreateStacksEnvGroupRequest{}
	ctx := r.Context()
	ctx, span := telemetry.NewSpan(ctx, "add-env-group stacks")
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}
	namespace := ctx.Value(types.NamespaceScope).(string)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	agent, err := c.GetAgent(r, cluster, namespace)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, 504, "error getting agent"))
		return
	}
	// if the environment group exists and has MetaVersion=1, throw an error

	aggregateReleases := []*release.Release{}
	for i := range request.Apps {
		namespaceStack := "porter-stack-" + request.Apps[i]
		helmAgent, err := c.GetHelmAgent(ctx, r, cluster, namespaceStack)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting helm")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, 504, "error getting agent"))
			return
		}
		releases, err := envgroup.GetStackSyncedReleases(helmAgent, namespaceStack)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error getting releases")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, 504, "error getting releases"))
			return
		}

		aggregateReleases = append(aggregateReleases, releases...)
	}

	errors := rolloutStacksApplications(c, c.Config(), cluster, request.Name, namespace, agent, aggregateReleases, r, w)

	if len(errors) > 0 {
		errStrArr := make([]string, 0)

		for _, err := range errors {
			errStrArr = append(errStrArr, err.Error())
		}

		c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrPassThroughToClient(err, 504, "error getting adding env group"))
		return
	}
	c.WriteResult(w, r, nil)
}

func rolloutStacksApplications(
	c *CreateStacksEnvGroupHandler,
	config *config.Config,
	cluster *models.Cluster,
	envGroupName string,
	namespace string,
	agent *kubernetes.Agent,
	releases []*release.Release,
	r *http.Request,
	w http.ResponseWriter,
) []error {
	registries, err := config.Repo.Registry().ListRegistriesByProjectID(cluster.ProjectID)
	if err != nil {
		return []error{err}
	}
	ctx := r.Context()
	ctx, span := telemetry.NewSpan(r.Context(), "roll-out-stack")
	// asynchronously update releases with that image repo uri
	var wg sync.WaitGroup
	mu := &sync.Mutex{}
	errors := make([]error, 0)

	for i, rel := range releases {
		index := i
		release := rel
		wg.Add(1)
		suffix := "-r"
		releaseName := release.Name
		if strings.HasSuffix(release.Name, suffix) {
			releaseName = strings.TrimSuffix(releaseName, suffix)
		}
		cm, _, err := agent.GetLatestVersionedConfigMap(envGroupName, "porter-stack-"+releaseName)
		if err != nil {
			return []error{err}
		}

		versionStr, ok := cm.ObjectMeta.Labels["version"]
		if !ok {
			return []error{err}
		}
		versionInt, err := strconv.Atoi(versionStr)
		if err != nil {
			return []error{err}
		}

		version := uint(versionInt)
		newSection := &SyncedEnvSection{
			Name:    envGroupName,
			Version: version,
		}

		newSectionKeys := make([]SyncedEnvSectionKey, 0)

		for key, val := range cm.Data {
			newSectionKeys = append(newSectionKeys, SyncedEnvSectionKey{
				Name:   key,
				Secret: strings.Contains(val, "PORTERSECRET"),
			})
		}

		newSection.Keys = newSectionKeys

		go func() {
			defer wg.Done()
			// read release via agent
			newConfig, err := getNewStacksConfig(release.Config, newSection, release)
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
			if !strings.HasSuffix(release.Name, suffix) {
				if req := releases[index].Chart.Metadata.Dependencies; req != nil {
					for _, dep := range req {
						dep.Name = getType(dep.Name)
					}
				}

				metadata := &chart.Metadata{
					Name:        "umbrella",
					Description: "Web application that is exposed to external traffic.",
					Version:     "0.96.0",
					APIVersion:  "v2",
					Home:        "https://getporter.dev/",
					Icon:        "https://user-images.githubusercontent.com/65516095/111255214-07d3da80-85ed-11eb-99e2-fddcbdb99bdb.png",
					Keywords: []string{
						"porter",
						"application",
						"service",
						"umbrella",
					},
					Type:         "application",
					Dependencies: releases[index].Chart.Metadata.Dependencies,
				}
				charter := &chart.Chart{
					Metadata: metadata,
				}
				conf := &helm.InstallChartConfig{
					Chart:      charter,
					Name:       releases[index].Name,
					Namespace:  "porter-stack-" + releases[index].Name,
					Values:     newConfig,
					Cluster:    cluster,
					Repo:       config.Repo,
					Registries: registries,
				}

				helmAgent, err := c.GetHelmAgent(ctx, r, cluster, "porter-stack-"+releases[index].Name)
				if err != nil {
					err = telemetry.Error(ctx, span, err, "error getting helm")
					return
				}
				_, err = helmAgent.UpgradeInstallChart(ctx, conf, config.DOConf, config.ServerConf.DisablePullSecretsInjection)
				if err != nil {
					mu.Lock()
					errors = append(errors, err)
					mu.Unlock()
					return
				}
			} else {
				helmAgent, err := c.GetHelmAgent(ctx, r, cluster, "porter-stack-"+releaseName)
				if err != nil {
					err = telemetry.Error(ctx, span, err, "error getting helm")
					return
				}
				helmRelease, err := helmAgent.GetRelease(ctx, rel.Name, 0, false)
				if err != nil {
					telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "creating-pre-deploy-job", Value: true})
					conf, err := createReleaseJobChart(
						ctx,
						releaseName,
						newConfig,
						c.Config().ServerConf.DefaultApplicationHelmRepoURL,
						registries,
						cluster,
						c.Repo(),
					)
					if err != nil {
						err = telemetry.Error(ctx, span, err, "error making config for pre-deploy job chart")
						c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
						return
					}

					_, err = helmAgent.InstallChart(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
					if err != nil {
						err = telemetry.Error(ctx, span, err, "error installing pre-deploy job chart")
						telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "install-pre-deploy-job-error", Value: err})
						c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
						_, uninstallChartErr := helmAgent.UninstallChart(ctx, fmt.Sprintf("%s-r", releaseName))
						if uninstallChartErr != nil {
							uninstallChartErr = telemetry.Error(ctx, span, err, "error uninstalling pre-deploy job chart after failed install")
							c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(uninstallChartErr, http.StatusInternalServerError))
						}
						return
					}
				} else {
					// telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-pre-deploy-job", Value: true})
					chart, err := loader.LoadChartPublic(ctx, c.Config().Metadata.DefaultAppHelmRepoURL, "job", "")
					if err != nil {
						// err = telemetry.Error(ctx, span, err, "error loading latest job chart")
						c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
						return
					}

					conf := &helm.UpgradeReleaseConfig{
						Name:       helmRelease.Name,
						Cluster:    cluster,
						Repo:       c.Repo(),
						Registries: registries,
						Values:     newConfig,
						Chart:      chart,
					}
					_, err = helmAgent.UpgradeReleaseByValues(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection, false)
					if err != nil {
						// err = telemetry.Error(ctx, span, err, "error upgrading pre-deploy job chart")
						c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
						return
					}
				}
			}
		}()

		app, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, releases[index].Name)
		ctx, span := telemetry.NewSpan(r.Context(), "serve-create-porter-app")
		updatedPorterApp, err := c.Repo().PorterApp().UpdatePorterApp(app)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error writing updated app to DB")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return []error{err}
		}
		imageInfo := attemptToGetImageInfoFromRelease(releases[i].Config)
		_, err = createPorterAppEvent(ctx, "SUCCESS", updatedPorterApp.ID, releases[i].Version+1, imageInfo.Tag, c.Repo().PorterAppEvent())
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating porter app event")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return []error{err}
		}

	}

	wg.Wait()

	return errors
}

func getNewStacksConfig(curr map[string]interface{}, syncedEnvSection *SyncedEnvSection, release *release.Release) (map[string]interface{}, error) {
	// look for container.env.synced
	aggEnvConf := make(map[string]interface{})

	for _, dep := range release.Chart.Metadata.Dependencies {
		envConf, err := getStacksNestedMap(curr, dep.Name, "container", "env")

		normalKeys, _ := envConf["normal"].(map[string]interface{})
		if err != nil {
			return nil, err
		}

		for k, v := range envConf {
			aggEnvConf[k] = v
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

						// check if mapConv["name"] is in normalKeys
						keyName, ok := mapConv["name"].(string) // check if "name" key exists and is a string
						if !ok {
							continue
						}
						if _, exists := normalKeys[keyName]; !exists {
							keyFieldMapArr = append(keyFieldMapArr, mapConv)
						}

					}

					keyFieldRes := make([]SyncedEnvSectionKey, 0)

					for _, keyFieldMap := range keyFieldMapArr {
						toAdd := SyncedEnvSectionKey{}

						if nameField, nameFieldExists := keyFieldMap["name"]; nameFieldExists {
							toAdd.Name, ok = nameField.(string)

							if !ok {
								continue
							}

							// only append if not in aggEnvConf
							if _, exists := aggEnvConf[toAdd.Name]; !exists {
								if secretField, secretFieldExists := keyFieldMap["secret"]; secretFieldExists {
									toAdd.Secret, ok = secretField.(bool)

									if !ok {
										continue
									}
								}

								keyFieldRes = append(keyFieldRes, toAdd)
							}
						}
					}
					syncedArrObj.Keys = keyFieldRes
				}

				syncedArr = append(syncedArr, syncedArrObj)
			}

			resArr := make([]SyncedEnvSection, 0)
			foundMatch := false

			for _, candidate := range syncedArr {
				if candidate.Name == syncedEnvSection.Name {
					resArr = append(resArr, *filterEnvConf(syncedEnvSection, normalKeys))
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

func getStacksNestedMap(obj map[string]interface{}, fields ...string) (map[string]interface{}, error) {
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

func filterEnvConf(syncedEnv *SyncedEnvSection, normalEnv map[string]interface{}) *SyncedEnvSection {
	// filter out keys that are already in normalEnv
	keys := make([]SyncedEnvSectionKey, 0)

	for _, key := range syncedEnv.Keys {
		if _, exists := normalEnv[key.Name]; !exists {
			keys = append(keys, key)
		}
	}

	syncedEnv.Keys = keys

	return syncedEnv
}

// postUpgrade runs any necessary scripting after the release has been upgraded.
// func postStacksUpgrade(config *config.Config, projectID, clusterID uint, envGroup *types.EnvGroup) error {
// 	// update the relevant env group version number if tied to a stack resource
// 	return stacks.UpdateEnvGroupVersion(config, projectID, clusterID, envGroup)
// }

func getType(name string) string {
	if strings.HasSuffix(name, "-web") {
		return "web"
	} else if strings.HasSuffix(name, "-wkr") {
		return "worker"
	} else if strings.HasSuffix(name, "-job") {
		return "job"
	}
	return ""
}

func createPorterAppEvent(ctx context.Context, status string, appID uint, revision int, tag string, repo repository.PorterAppEventRepository) (*models.PorterAppEvent, error) {
	event := models.PorterAppEvent{
		ID:                 uuid.New(),
		Status:             status,
		Type:               "DEPLOY",
		TypeExternalSource: "KUBERNETES",
		PorterAppID:        appID,
		Metadata: map[string]any{
			"revision":  revision,
			"image_tag": tag,
		},
	}

	err := repo.CreateEvent(ctx, &event)
	if err != nil {
		return nil, err
	}

	if event.ID == uuid.Nil {
		return nil, err
	}

	return &event, nil
}

func attemptToGetImageInfoFromRelease(values map[string]interface{}) types.ImageInfo {
	imageInfo := types.ImageInfo{}

	if values == nil {
		return imageInfo
	}

	globalImage, err := getNestedMap(values, "global", "image")
	if err != nil {
		return imageInfo
	}

	repoVal, okRepo := globalImage["repository"]
	tagVal, okTag := globalImage["tag"]
	if okRepo && okTag {
		imageInfo.Repository = repoVal.(string)
		imageInfo.Tag = tagVal.(string)
	}

	return imageInfo
}

func createReleaseJobChart(
	ctx context.Context,
	stackName string,
	values map[string]interface{},
	repoUrl string,
	registries []*models.Registry,
	cluster *models.Cluster,
	repo repository.Repository,
) (*helm.InstallChartConfig, error) {
	chart, err := loader.LoadChartPublic(ctx, repoUrl, "job", "")
	if err != nil {
		return nil, err
	}

	releaseName := fmt.Sprintf("%s-r", stackName)
	namespace := fmt.Sprintf("porter-stack-%s", stackName)

	return &helm.InstallChartConfig{
		Chart:      chart,
		Name:       releaseName,
		Namespace:  namespace,
		Values:     values,
		Cluster:    cluster,
		Repo:       repo,
		Registries: registries,
	}, nil
}
