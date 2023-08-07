package porter_app

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/cluster"
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
	user, _ := ctx.Value(types.UserScope).(*models.User)

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
	namespace := fmt.Sprintf("porter-stack-%s", stackName)
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "application-name", Value: stackName})

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
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	imageInfo := request.ImageInfo
	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing registries")
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
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
					telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
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
		app, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName)
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
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		cloneEnvGroup(c, w, r, k8sAgent, request.EnvGroups, namespace)
	}

	if imageInfo.Repository == "" || imageInfo.Tag == "" {
		err = telemetry.Error(ctx, span, nil, "incomplete image info provided: must provide both repository and tag")
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	var addCustomNodeSelector bool
	if (cluster.ProvisionedBy == "CAPI" && cluster.CloudProvider == "GCP") || cluster.GCPIntegrationID != 0 {
		addCustomNodeSelector = true
	}

	chart, values, preDeployJobValues, err := parse(
		ctx,
		ParseConf{
			PorterYaml:                porterYaml,
			ImageInfo:                 imageInfo,
			ServerConfig:              c.Config(),
			ProjectID:                 cluster.ProjectID,
			UserUpdate:                request.UserUpdate,
			EnvGroups:                 request.EnvGroups,
			EnvironmentGroups:         request.EnvironmentGroups,
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
			AddCustomNodeSelector:        addCustomNodeSelector,
		},
	)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "parse error")
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if shouldCreate {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "installing-application", Value: true})

		// create the release job chart if it does not exist (only done by front-end currently, where we set overrideRelease=true)
		if request.OverrideRelease && preDeployJobValues != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "installing-pre-deploy-job", Value: true})
			conf, err := createPreDeployJobChart(
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
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
			_, err = helmAgent.InstallChart(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error installing pre-deploy job chart")
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "install-pre-deploy-job-error", Value: err})
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
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
		release, err := helmAgent.InstallChart(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error installing app chart")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			_, err = helmAgent.UninstallChart(ctx, stackName)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error uninstalling app chart after failed install")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			}

			return
		}

		existing, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error reading app from DB")
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		} else if existing.Name != "" {
			err = telemetry.Error(ctx, span, err, "app with name already exists in project")
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
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

		// create the db entry
		porterApp, err := c.Repo().PorterApp().UpdatePorterApp(app)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error writing app to DB")
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		// Only create the PROGRESSING event if the cluster's agent is updated, because only the updated agent can update the status
		// TODO: remove dependence on porter email once we are ready to release this feature
		if isPorterAgentUpdated(k8sAgent, 3, 1, 6) && strings.HasSuffix(user.Email, "porter.run") {
			serviceDeploymentStatusMap := getServiceDeploymentMetadataFromValues(values, "PROGRESSING")
			_, err = createNewPorterAppDeployEvent(ctx, serviceDeploymentStatusMap, "PROGRESSING", porterApp.ID, 1, imageInfo.Tag, c.Repo().PorterAppEvent())
		} else {
			_, err = createOldPorterAppDeployEvent(ctx, "SUCCESS", porterApp.ID, 1, imageInfo.Tag, c.Repo().PorterAppEvent())
		}
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating porter app event")
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		c.WriteResult(w, r, porterApp.ToPorterAppTypeWithRevision(release.Version))
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
						telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
						c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
						return
					}
				}
			} else {
				preDeployJobName := fmt.Sprintf("%s-r", stackName)
				helmRelease, err := helmAgent.GetRelease(ctx, preDeployJobName, 0, false)
				if err != nil {
					telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "creating-pre-deploy-job", Value: true})
					conf, err := createPreDeployJobChart(
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
						telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
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
						telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
						return
					}
				} else {
					telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-pre-deploy-job", Value: true})
					chart, err := loader.LoadChartPublic(ctx, c.Config().Metadata.DefaultAppHelmRepoURL, "job", "")
					if err != nil {
						err = telemetry.Error(ctx, span, err, "error loading latest job chart")
						telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
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
						telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
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
		release, err := helmAgent.UpgradeInstallChart(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error upgrading application")
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
			return
		}

		// update the DB entry
		app, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error reading app from DB")
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		if app == nil {
			err = telemetry.Error(ctx, span, nil, "app with name does not exist in project")
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
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
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		// Only create the PROGRESSING event if the cluster's agent is updated, because only the updated agent can update the status
		// TODO: remove dependence on porter email once we are ready to release this feature
		if isPorterAgentUpdated(k8sAgent, 3, 1, 6) && strings.HasSuffix(user.Email, "porter.run") {
			serviceDeploymentStatusMap := getServiceDeploymentMetadataFromValues(values, "PROGRESSING")
			_, err = createNewPorterAppDeployEvent(ctx, serviceDeploymentStatusMap, "PROGRESSING", updatedPorterApp.ID, helmRelease.Version+1, imageInfo.Tag, c.Repo().PorterAppEvent())
		} else {
			_, err = createOldPorterAppDeployEvent(ctx, "SUCCESS", updatedPorterApp.ID, helmRelease.Version+1, imageInfo.Tag, c.Repo().PorterAppEvent())
		}
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating porter app event")
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-yaml-base64", Value: porterYamlBase64})
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		c.WriteResult(w, r, updatedPorterApp.ToPorterAppTypeWithRevision(release.Version))
	}
}

// createOldPorterAppDeployEvent creates an event for use in the activity feed
// TODO: remove this method and all call-sites if this span no longer exists in telemetry for 4 consecutive weeks
func createOldPorterAppDeployEvent(ctx context.Context, status string, appID uint, revision int, tag string, repo repository.PorterAppEventRepository) (*models.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-old-porter-app-deploy-event")
	defer span.End()

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

// createNewPorterAppDeployEvent creates an event for use in the activity feed, supplemented with information about the
// deployed services in serviceStatusMap as well as the image tag being deployed
func createNewPorterAppDeployEvent(
	ctx context.Context,
	serviceStatusMap map[string]types.ServiceDeploymentMetadata,
	status string,
	appID uint,
	revision int,
	tag string,
	repo repository.PorterAppEventRepository,
) (*models.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-new-porter-app-deploy-event")
	defer span.End()

	// mark all pending deployments from the deploy event of the previous revision as canceled
	updatePreviousPorterAppDeployEvent(ctx, appID, revision, repo)

	event := models.PorterAppEvent{
		ID:                 uuid.New(),
		Status:             status,
		Type:               "DEPLOY",
		TypeExternalSource: "KUBERNETES",
		PorterAppID:        appID,
		Metadata: map[string]any{
			"revision":                    revision,
			"image_tag":                   tag,
			"service_deployment_metadata": serviceStatusMap,
		},
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "revision", Value: revision}, telemetry.AttributeKV{Key: "image-tag", Value: tag})

	err := repo.CreateEvent(ctx, &event)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating porter app event")
		return nil, err
	}

	if event.ID == uuid.Nil {
		return nil, telemetry.Error(ctx, span, nil, "event id for newly created app event is nil")
	}

	return &event, nil
}

// updatePreviousPorterAppDeployEvent updates the previous deploy event to change the event status as well as all service statuses to CANCELED
// if it is still in the PROGRESSING state. This is done to prevent the activity feed from showing an old deploy event as still in progress.
func updatePreviousPorterAppDeployEvent(ctx context.Context, appID uint, revision int, repo repository.PorterAppEventRepository) {
	ctx, span := telemetry.NewSpan(ctx, "update-previous-porter-app-deploy-event")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-previous-event", Value: false}, telemetry.AttributeKV{Key: "new-revision", Value: revision})
	if revision <= 1 {
		return
	}
	revisionFloat64 := float64(revision - 1)
	matchEvent, err := repo.ReadDeployEventByRevision(ctx, appID, revisionFloat64)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error reading deploy event by revision")
		return
	}
	if matchEvent.ID == uuid.Nil {
		_ = telemetry.Error(ctx, span, nil, "could not find previous deploy event")
		return
	}
	if matchEvent.Status != "PROGRESSING" {
		return
	}
	serviceStatus, ok := matchEvent.Metadata["service_deployment_metadata"]
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "service deployment metadata not found in deploy event metadata")
		return
	}
	serviceDeploymentGenericMap, ok := serviceStatus.(map[string]interface{})
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "service deployment metadata is not map[string]interface{}")
		return
	}
	serviceDeploymentMap := make(map[string]types.ServiceDeploymentMetadata)
	for k, v := range serviceDeploymentGenericMap {
		by, err := json.Marshal(v)
		if err != nil {
			_ = telemetry.Error(ctx, span, nil, "unable to marshal")
			return
		}

		var serviceDeploymentMetadata types.ServiceDeploymentMetadata
		err = json.Unmarshal(by, &serviceDeploymentMetadata)
		if err != nil {
			_ = telemetry.Error(ctx, span, nil, "unable to unmarshal")
			return
		}
		serviceDeploymentMap[k] = serviceDeploymentMetadata
	}
	for key, serviceDeploymentMetadata := range serviceDeploymentMap {
		if serviceDeploymentMetadata.Status == "PROGRESSING" {
			serviceDeploymentMetadata.Status = "CANCELED"
			serviceDeploymentMap[key] = serviceDeploymentMetadata
		}
	}
	matchEvent.Metadata["service_deployment_metadata"] = serviceDeploymentMap
	matchEvent.Status = "CANCELED"
	err = repo.UpdateEvent(ctx, &matchEvent)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error updating deploy event")
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-previous-event", Value: true})
}

func createPreDeployJobChart(
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

// isPorterAgentUpdated checks if the agent version is at least the version specified by the major, minor, and patch arguments
func isPorterAgentUpdated(agent *kubernetes.Agent, major, minor, patch int) bool {
	res, err := cluster.GetAgentVersionResponse(agent)
	if err != nil {
		return false
	}
	image := res.Image
	parsed := strings.Split(image, ":")

	if len(parsed) != 2 {
		return false
	}

	tag := parsed[1]
	if tag == "dev" {
		return true
	}

	parsedTag := strings.Split(tag, ".")
	if len(parsedTag) != 3 {
		return false
	}

	parsedMajor, _ := strconv.Atoi(parsedTag[0])
	parsedMinor, _ := strconv.Atoi(parsedTag[1])
	parsedPatch, _ := strconv.Atoi(parsedTag[2])
	if parsedMajor < major {
		return false
	}
	if parsedMinor < minor {
		return false
	}
	if parsedPatch < patch {
		return false
	}
	return true
}
