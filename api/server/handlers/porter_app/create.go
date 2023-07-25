package porter_app

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/stefanmcshane/helm/pkg/chart"
)

type CreatePorterAppHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreatePorterAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreatePorterAppHandler {
	return &CreatePorterAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreatePorterAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-porter-app")
	defer span.End()

	request := &types.CreatePorterAppRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	stackName, reqErr := requestutils.GetURLParamString(r, types.URLParamStackName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error getting stack name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "application-name", Value: stackName})
	var namespace string
	if request.Namespace != "" {
		namespace = request.Namespace
	} else {
		namespace = fmt.Sprintf("porter-stack-%s", stackName)
	}

	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting helm agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	k8sAgent, err := c.GetAgent(r, cluster, namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting k8s agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	helmRelease, err := helmAgent.GetRelease(ctx, stackName, 0, false)
	shouldCreate := err != nil

	porterYamlBase64 := request.PorterYAMLBase64
	porterYaml, err := base64.StdEncoding.DecodeString(porterYamlBase64)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error decoding porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	imageInfo := request.ImageInfo
	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing registries")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var releaseValues map[string]interface{}
	var releaseDependencies []*chart.Dependency
	if shouldCreate || request.OverrideRelease {
		releaseValues = nil
		releaseDependencies = nil

		// this is required because when the front-end sends an update request with overrideRelease=true, it is unable to
		// get the image info from the release. unless it is explicitly provided in the request, we avoid overwriting it
		// by attempting to get the image info from the release or the provided helm values
		if helmRelease != nil && (imageInfo.Repository == "" || imageInfo.Tag == "") {
			if request.FullHelmValues != "" {
				imageInfo, err = attemptToGetImageInfoFromFullHelmValues(request.FullHelmValues)
				if err != nil {
					err = telemetry.Error(ctx, span, err, "error getting image info from full helm values")
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
					return
				}
			} else {
				imageInfo = attemptToGetImageInfoFromRelease(helmRelease.Config)
			}
		}
	} else {
		releaseValues = helmRelease.Config
		releaseDependencies = helmRelease.Chart.Metadata.Dependencies
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "image-repo", Value: imageInfo.Repository}, telemetry.AttributeKV{Key: "image-tag", Value: imageInfo.Tag})

	if request.Builder == "" {
		// attempt to get builder from db
		app, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName, request.EnvironmentConfigID)
		if err == nil {
			request.Builder = app.Builder
		}
	}
	injectLauncher := strings.Contains(request.Builder, "heroku") ||
		strings.Contains(request.Builder, "paketo")
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "builder", Value: request.Builder})

	if shouldCreate {
		// create the namespace if it does not exist already
		_, err = k8sAgent.CreateNamespace(namespace, nil)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating namespace")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		cloneEnvGroup(c, w, r, k8sAgent, request.EnvGroups, namespace)
	}
	chart, values, preDeployJobValues, err := parse(
		ParseConf{
			PorterYaml:                porterYaml,
			ImageInfo:                 imageInfo,
			ServerConfig:              c.Config(),
			ProjectID:                 cluster.ProjectID,
			UserUpdate:                request.UserUpdate,
			EnvGroups:                 request.EnvGroups,
			Namespace:                 namespace,
			ExistingHelmValues:        releaseValues,
			ExistingChartDependencies: releaseDependencies,
			SubdomainCreateOpts: SubdomainCreateOpts{
				k8sAgent:       k8sAgent,
				dnsRepo:        c.Repo().DNSRecord(),
				powerDnsClient: c.Config().PowerDNSClient,
				appRootDomain:  c.Config().ServerConf.AppRootDomain,
				stackName:      stackName,
			},
			InjectLauncherToStartCommand: injectLauncher,
			ShouldValidateHelmValues:     shouldCreate,
			FullHelmValues:               request.FullHelmValues,
		},
	)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "parse error")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if shouldCreate {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "installing-application", Value: true})

		// create the release job chart if it does not exist (only done by front-end currently, where we set overrideRelease=true)
		if request.OverrideRelease && preDeployJobValues != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "installing-pre-deploy-job", Value: true})
			conf, err := createReleaseJobChart(
				ctx,
				stackName,
				preDeployJobValues,
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
				_, uninstallChartErr := helmAgent.UninstallChart(ctx, fmt.Sprintf("%s-r", stackName))
				if uninstallChartErr != nil {
					uninstallChartErr = telemetry.Error(ctx, span, err, "error uninstalling pre-deploy job chart after failed install")
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(uninstallChartErr, http.StatusInternalServerError))
				}
				return
			}
		}

		conf := &helm.InstallChartConfig{
			Chart:      chart,
			Name:       stackName,
			Namespace:  namespace,
			Values:     values,
			Cluster:    cluster,
			Repo:       c.Repo(),
			Registries: registries,
		}

		// create the app chart
		_, err = helmAgent.InstallChart(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error installing app chart")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))

			_, err = helmAgent.UninstallChart(ctx, stackName)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error uninstalling app chart after failed install")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			}

			return
		}

		app := &models.PorterApp{
			Name:      stackName,
			ClusterID: cluster.ID,
			ProjectID: project.ID,
			RepoName:  request.RepoName,
			GitRepoID: request.GitRepoID,
			GitBranch: request.GitBranch,

			BuildContext:   request.BuildContext,
			Builder:        request.Builder,
			Buildpacks:     request.Buildpacks,
			Dockerfile:     request.Dockerfile,
			ImageRepoURI:   request.ImageRepoURI,
			PullRequestURL: request.PullRequestURL,
			PorterYamlPath: request.PorterYamlPath,
		}

		existing, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName, request.EnvironmentConfigID)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			err = telemetry.Error(ctx, span, err, "error reading app from DB")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		// asssuming that namespace not being set means the app is running in production env
		if existing != nil && request.Namespace == "" {
			err = telemetry.Error(ctx, span, err, "app with name already exists in environment")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
			return
		}

		err = assignEnvironmentToApp(c, app, project.ID, cluster.ID, request.EnvironmentConfigID)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error assigning environment to app")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		// create the db entry
		porterApp, err := c.Repo().PorterApp().UpdatePorterApp(app)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error writing app to DB")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		_, err = createPorterAppEvent(ctx, "SUCCESS", porterApp.ID, 1, imageInfo.Tag, c.Repo().PorterAppEvent())
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating porter app event")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		c.WriteResult(w, r, porterApp.ToPorterAppType())
	} else {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "upgrading-application", Value: true})

		// create/update the pre-deploy job chart
		if request.OverrideRelease {
			if preDeployJobValues == nil {
				preDeployJobName := fmt.Sprintf("%s-r", stackName)
				_, err := helmAgent.GetRelease(ctx, preDeployJobName, 0, false)
				if err == nil {
					// handle exception where the user has chosen to delete the release job
					telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "deleting-pre-deploy-job", Value: true})
					_, err = helmAgent.UninstallChart(ctx, preDeployJobName)
					if err != nil {
						err = telemetry.Error(ctx, span, err, "error uninstalling pre-deploy job chart")
						c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
						return
					}
				}
			} else {
				preDeployJobName := fmt.Sprintf("%s-r", stackName)
				helmRelease, err := helmAgent.GetRelease(ctx, preDeployJobName, 0, false)
				if err != nil {
					telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "creating-pre-deploy-job", Value: true})
					conf, err := createReleaseJobChart(
						ctx,
						stackName,
						preDeployJobValues,
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
						_, uninstallChartErr := helmAgent.UninstallChart(ctx, fmt.Sprintf("%s-r", stackName))
						if uninstallChartErr != nil {
							uninstallChartErr = telemetry.Error(ctx, span, err, "error uninstalling pre-deploy job chart after failed install")
							c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(uninstallChartErr, http.StatusInternalServerError))
						}
						return
					}
				} else {
					telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-pre-deploy-job", Value: true})
					chart, err := loader.LoadChartPublic(ctx, c.Config().Metadata.DefaultAppHelmRepoURL, "job", "")
					if err != nil {
						err = telemetry.Error(ctx, span, err, "error loading latest job chart")
						c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
						return
					}

					conf := &helm.UpgradeReleaseConfig{
						Name:       helmRelease.Name,
						Cluster:    cluster,
						Repo:       c.Repo(),
						Registries: registries,
						Values:     preDeployJobValues,
						Chart:      chart,
					}
					_, err = helmAgent.UpgradeReleaseByValues(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection, false)
					if err != nil {
						err = telemetry.Error(ctx, span, err, "error upgrading pre-deploy job chart")
						c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
						return
					}
				}
			}
		}

		// update the app chart
		conf := &helm.InstallChartConfig{
			Chart:      chart,
			Name:       stackName,
			Namespace:  namespace,
			Values:     values,
			Cluster:    cluster,
			Repo:       c.Repo(),
			Registries: registries,
		}
		// update the chart
		_, err = helmAgent.UpgradeInstallChart(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error upgrading application")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		// update the DB entry
		app, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName, request.EnvironmentConfigID)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			err = telemetry.Error(ctx, span, err, "error reading app from DB")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		if app == nil {
			err = telemetry.Error(ctx, span, nil, "app with name does not exist in project")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
			return
		}

		if request.RepoName != "" {
			app.RepoName = request.RepoName
		}
		if request.GitBranch != "" {
			app.GitBranch = request.GitBranch
		}
		if request.BuildContext != "" {
			app.BuildContext = request.BuildContext
		}
		// handles deletion of builder,buildpacks, and dockerfile path
		if request.Builder != "" {
			if request.Builder == "null" {
				app.Builder = ""
			} else {
				app.Builder = request.Builder
			}
		}
		if request.Buildpacks != "" {
			if request.Buildpacks == "null" {
				app.Buildpacks = ""
			} else {
				app.Buildpacks = request.Buildpacks
			}
		}
		if request.Dockerfile != "" {
			if request.Dockerfile == "null" {
				app.Dockerfile = ""
			} else {
				app.Dockerfile = request.Dockerfile
			}
		}
		if request.ImageRepoURI != "" {
			app.ImageRepoURI = request.ImageRepoURI
		}
		if request.PullRequestURL != "" {
			app.PullRequestURL = request.PullRequestURL
		}

		telemetry.WithAttributes(
			span,
			telemetry.AttributeKV{Key: "updated-repo-name", Value: app.RepoName},
			telemetry.AttributeKV{Key: "updated-git-branch", Value: app.GitBranch},
			telemetry.AttributeKV{Key: "updated-build-context", Value: app.BuildContext},
			telemetry.AttributeKV{Key: "updated-builder", Value: app.Builder},
			telemetry.AttributeKV{Key: "updated-buildpacks", Value: app.Buildpacks},
			telemetry.AttributeKV{Key: "updated-dockerfile", Value: app.Dockerfile},
			telemetry.AttributeKV{Key: "updated-image-repo-uri", Value: app.ImageRepoURI},
			telemetry.AttributeKV{Key: "updated-pull-request-url", Value: app.PullRequestURL},
		)

		updatedPorterApp, err := c.Repo().PorterApp().UpdatePorterApp(app)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error writing updated app to DB")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		_, err = createPorterAppEvent(ctx, "SUCCESS", updatedPorterApp.ID, helmRelease.Version+1, imageInfo.Tag, c.Repo().PorterAppEvent())
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating porter app event")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		c.WriteResult(w, r, updatedPorterApp.ToPorterAppType())
	}
}

// createPorterAppEvent creates an event for use in the activity feed
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

func cloneEnvGroup(c *CreatePorterAppHandler, w http.ResponseWriter, r *http.Request, agent *kubernetes.Agent, envGroups []string, namespace string) {
	for _, envGroupName := range envGroups {
		cm, _, err := agent.GetLatestVersionedConfigMap(envGroupName, "porter-env-group")
		if err != nil {
			if errors.Is(err, kubernetes.IsNotFoundError) {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
					fmt.Errorf("error cloning env group: envgroup %s in namespace %s not found", envGroupName, "porter-env-group"), http.StatusNotFound,
					"no config map found for envgroup",
				))
				return
			}

			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
		secret, _, err := agent.GetLatestVersionedSecret(envGroupName, "porter-env-group")
		if err != nil {
			if errors.Is(err, kubernetes.IsNotFoundError) {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
					fmt.Errorf("error cloning env group: envgroup %s in namespace %s not found", envGroupName, "porter-env-group"), http.StatusNotFound,
					"no k8s secret found for envgroup",
				))
				return
			}

			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
		vars := make(map[string]string)
		secretVars := make(map[string]string)

		for key, val := range cm.Data {
			if !strings.Contains(val, "PORTERSECRET") {
				vars[key] = val
			}
		}

		for key, val := range secret.Data {
			secretVars[key] = string(val)
		}

		configMap, err := envgroup.CreateEnvGroup(agent, types.ConfigMapInput{
			Name:            envGroupName,
			Namespace:       namespace,
			Variables:       vars,
			SecretVariables: secretVars,
		})
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		_, err = envgroup.ToEnvGroup(configMap)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}

func assignEnvironmentToApp(c *CreatePorterAppHandler, app *models.PorterApp, projectID, clusterID, envConfID uint) error {
	ctx, span := telemetry.NewSpan(context.Background(), "assign-env-to-app")
	if app == nil {
		return fmt.Errorf("Application does not exist")
	}

	if envConfID != 0 {
		envConf, err := c.Repo().EnvironmentConfig().ReadEnvironmentConfig(projectID, clusterID, envConfID)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error reading environment config from DB")
		}

		app.EnvironmentConfigID = envConf.ID
		return nil
	}

	envConf, err := c.Repo().EnvironmentConfig().ReadDefaultEnvironmentConfig(projectID, clusterID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error reading environment config from DB")
	}

	app.EnvironmentConfigID = envConf.ID
	return nil
}
