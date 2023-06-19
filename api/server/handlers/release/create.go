package release

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/helm/repo"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
	"github.com/porter-dev/porter/internal/integrations/ci/gitlab"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/registry"
	"github.com/stefanmcshane/helm/pkg/release"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/yaml.v2"
	v1 "k8s.io/api/core/v1"
)

type CreateReleaseHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateReleaseHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateReleaseHandler {
	return &CreateReleaseHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateReleaseHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace := r.Context().Value(types.NamespaceScope).(string)
	operationID := oauth.CreateRandomState()

	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-release")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: cluster.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
		telemetry.AttributeKV{Key: "user-email", Value: user.Email},
		telemetry.AttributeKV{Key: "namespace", Value: namespace},
	)

	c.Config().AnalyticsClient.Track(analytics.ApplicationLaunchStartTrack(
		&analytics.ApplicationLaunchStartTrackOpts{
			ClusterScopedTrackOpts: analytics.GetClusterScopedTrackOpts(user.ID, cluster.ProjectID, cluster.ID),
			FlowID:                 operationID,
		},
	))

	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, "")
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error getting helm agent")))
		return
	}

	request := &types.CreateReleaseRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.RepoURL == "" {
		request.RepoURL = c.Config().ServerConf.DefaultApplicationHelmRepoURL
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "repo-url", Value: request.RepoURL})

	// if the repo url is not an addon or application url, validate against the helm repos
	if request.RepoURL != c.Config().ServerConf.DefaultAddonHelmRepoURL && request.RepoURL != c.Config().ServerConf.DefaultApplicationHelmRepoURL {
		// load the helm repos in the project
		hrs, err := c.Repo().HelmRepo().ListHelmReposByProjectID(cluster.ProjectID)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error listing helm repos for project")))
			return
		}

		isValid := repo.ValidateRepoURL(c.Config().ServerConf.DefaultAddonHelmRepoURL, c.Config().ServerConf.DefaultApplicationHelmRepoURL, hrs, request.RepoURL)

		if !isValid {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				telemetry.Error(ctx, span, err, "invalid repo_url parameter"),
				http.StatusBadRequest,
			))

			return
		}
	}

	if request.TemplateVersion == "latest" {
		request.TemplateVersion = ""
	}

	chart, err := loader.LoadChartPublic(ctx, request.RepoURL, request.TemplateName, request.TemplateVersion)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error loading public chart")))
		return
	}

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error listing registries")))
		return
	}

	k8sAgent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error getting k8s agent")))
		return
	}

	// create the namespace if it does not exist already
	_, err = k8sAgent.CreateNamespace(namespace, nil)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error creating namespace")))
		return
	}

	conf := &helm.InstallChartConfig{
		Chart:                     chart,
		Name:                      request.Name,
		Namespace:                 namespace,
		Values:                    request.Values,
		Cluster:                   cluster,
		Repo:                      c.Repo(),
		Registries:                registries,
		ClusterControlPlaneClient: c.Config().ClusterControlPlaneClient,
	}

	helmRelease, err := helmAgent.InstallChart(ctx, conf, c.Config().DOConf, c.Config().ServerConf.DisablePullSecretsInjection)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			telemetry.Error(ctx, span, err, "error installing a new chart"),
			http.StatusBadRequest,
		))

		return
	}

	configMaps := make([]*v1.ConfigMap, 0)

	if request.SyncedEnvGroups != nil && len(request.SyncedEnvGroups) > 0 {
		for _, envGroupName := range request.SyncedEnvGroups {
			// read the attached configmap
			cm, _, err := k8sAgent.GetLatestVersionedConfigMap(envGroupName, namespace)
			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(telemetry.Error(ctx, span, err, "Couldn't find the env group"), http.StatusNotFound))
				return
			}

			configMaps = append(configMaps, cm)
		}
	}

	release, err := CreateAppReleaseFromHelmRelease(ctx, c.Config(), cluster.ProjectID, cluster.ID, 0, helmRelease)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error creating app release from helm release")))
		return
	}

	if len(configMaps) > 0 {
		for _, cm := range configMaps {

			_, err = k8sAgent.AddApplicationToVersionedConfigMap(cm, release.Name)

			if err != nil {
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "release-name", Value: release.Name})
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "config-map-name", Value: cm.Name})
				c.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "Couldn't add release to the config map")))
			}
		}
	}

	if request.Tags != nil {
		tags, err := c.Repo().Tag().LinkTagsToRelease(request.Tags, release)

		if err == nil {
			release.Tags = append(release.Tags, tags...)
		}
	}

	if request.BuildConfig != nil {
		_, err = createBuildConfig(ctx, c.Config(), release, request.BuildConfig)
	}

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error building config")))
		return
	}

	if request.GitActionConfig != nil {
		_, _, err := createGitAction(
			ctx,
			c.Config(),
			user.ID,
			cluster.ProjectID,
			cluster.ID,
			request.GitActionConfig,
			request.Name,
			namespace,
			release,
		)
		if err != nil {
			unwrappedErr := errors.Unwrap(err)

			if unwrappedErr != nil {
				if errors.Is(unwrappedErr, actions.ErrProtectedBranch) {
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(telemetry.Error(ctx, span, err, "error creating git action on protected branch"), http.StatusConflict))
				} else if errors.Is(unwrappedErr, actions.ErrCreatePRForProtectedBranch) {
					c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(telemetry.Error(ctx, span, err, "error creating PR on protected branch"), http.StatusPreconditionFailed))
				}
			} else {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(telemetry.Error(ctx, span, err, "error creating git action")))
				return
			}
		}
	}

	c.Config().AnalyticsClient.Track(analytics.ApplicationLaunchSuccessTrack(
		&analytics.ApplicationLaunchSuccessTrackOpts{
			ApplicationScopedTrackOpts: analytics.GetApplicationScopedTrackOpts(
				user.ID,
				cluster.ProjectID,
				cluster.ID,
				release.Name,
				release.Namespace,
				chart.Metadata.Name,
			),
			FlowID: operationID,
		},
	))

	w.WriteHeader(http.StatusCreated)
}

func CreateAppReleaseFromHelmRelease(
	ctx context.Context,
	config *config.Config,
	projectID, clusterID, stackResourceID uint,
	helmRelease *release.Release,
) (*models.Release, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-app-release-from-helm-release")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: projectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: clusterID},
		telemetry.AttributeKV{Key: "stack-resource-id", Value: stackResourceID},
		telemetry.AttributeKV{Key: "helm-release-name", Value: helmRelease.Name},
	)

	token, err := encryption.GenerateRandomBytes(16)
	if err != nil {
		return nil, err
	}

	// create release with webhook token in db
	image, ok := helmRelease.Config["image"].(map[string]interface{})

	if !ok {
		return nil, telemetry.Error(ctx, span, nil, "Could not find field image in config")
	}

	repository := image["repository"]
	repoStr, ok := repository.(string)

	if !ok {
		return nil, telemetry.Error(ctx, span, nil, "Could not find field repository in config")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "repo-uri", Value: repoStr})

	release := &models.Release{
		ClusterID:       clusterID,
		ProjectID:       projectID,
		Namespace:       helmRelease.Namespace,
		Name:            helmRelease.Name,
		WebhookToken:    token,
		ImageRepoURI:    repoStr,
		StackResourceID: stackResourceID,
	}

	return config.Repo.Release().CreateRelease(release)
}

func CreateAddonReleaseFromHelmRelease(
	config *config.Config,
	projectID, clusterID, stackResourceID uint,
	helmRelease *release.Release,
) (*models.Release, error) {
	release := &models.Release{
		ClusterID:       clusterID,
		ProjectID:       projectID,
		Namespace:       helmRelease.Namespace,
		Name:            helmRelease.Name,
		StackResourceID: stackResourceID,
	}

	return config.Repo.Release().CreateRelease(release)
}

func createGitAction(
	ctx context.Context,
	config *config.Config,
	userID, projectID, clusterID uint,
	request *types.CreateGitActionConfigRequest,
	name, namespace string,
	release *models.Release,
) (*types.GitActionConfig, []byte, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-git-action")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: projectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: clusterID},
		telemetry.AttributeKV{Key: "user-id", Value: userID},
		telemetry.AttributeKV{Key: "name", Value: name},
		telemetry.AttributeKV{Key: "namespace", Value: namespace},
	)

	// if the registry was provisioned through Porter, create a repository if necessary
	if release != nil && request.RegistryID != 0 {
		// read the registry
		reg, err := config.Repo.Registry().ReadRegistry(projectID, request.RegistryID)
		if err != nil {
			return nil, nil, telemetry.Error(ctx, span, err, "could not read repo registry")
		}

		_reg := registry.Registry(*reg)
		regAPI := &_reg

		// parse the name from the registry
		nameSpl := strings.Split(request.ImageRepoURI, "/")
		repoName := nameSpl[len(nameSpl)-1]

		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "repo-name", Value: repoName})

		err = regAPI.CreateRepository(ctx, config, repoName)

		if err != nil {
			return nil, nil, telemetry.Error(ctx, span, err, "could not create repo")
		}
	}

	isDryRun := release == nil

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "is-dry-run", Value: isDryRun})

	encoded := ""
	var err error

	// if this isn't a dry run, generate the token
	if !isDryRun {
		encoded, err = getToken(ctx, config, userID, projectID, clusterID, request)

		if err != nil {
			return nil, nil, telemetry.Error(ctx, span, err, "error getting token")
		}
	}

	var workflowYAML []byte
	var gitErr error

	if request.GitlabIntegrationID != 0 {
		giRunner := &gitlab.GitlabCI{
			ServerURL:        config.ServerConf.ServerURL,
			GitRepoPath:      request.GitRepo,
			GitBranch:        request.GitBranch,
			Repo:             config.Repo,
			ProjectID:        projectID,
			ClusterID:        clusterID,
			UserID:           userID,
			IntegrationID:    request.GitlabIntegrationID,
			PorterConf:       config,
			ReleaseName:      name,
			ReleaseNamespace: namespace,
			FolderPath:       request.FolderPath,
			PorterToken:      encoded,
		}

		gitErr = giRunner.Setup()
	} else {
		repoSplit := strings.Split(request.GitRepo, "/")

		if len(repoSplit) != 2 {
			return nil, nil, fmt.Errorf("invalid formatting of repo name")
		}

		// create the commit in the git repo
		gaRunner := &actions.GithubActions{
			InstanceName:           config.ServerConf.InstanceName,
			ServerURL:              config.ServerConf.ServerURL,
			GithubOAuthIntegration: nil,
			GithubAppID:            config.GithubAppConf.AppID,
			GithubAppSecretPath:    config.GithubAppConf.SecretPath,
			GithubInstallationID:   request.GitRepoID,
			GitRepoName:            repoSplit[1],
			GitRepoOwner:           repoSplit[0],
			Repo:                   config.Repo,
			ProjectID:              projectID,
			ClusterID:              clusterID,
			ReleaseName:            name,
			ReleaseNamespace:       namespace,
			GitBranch:              request.GitBranch,
			DockerFilePath:         request.DockerfilePath,
			FolderPath:             request.FolderPath,
			ImageRepoURL:           request.ImageRepoURI,
			PorterToken:            encoded,
			Version:                "v0.1.0",
			ShouldCreateWorkflow:   request.ShouldCreateWorkflow,
			DryRun:                 release == nil,
		}

		// Save the github err for after creating the git action config. However, we
		// need to call Setup() in order to get the workflow file before writing the
		// action config, in the case of a dry run, since the dry run does not create
		// a git action config.
		workflowYAML, gitErr = gaRunner.Setup()

		if gaRunner.DryRun {
			if gitErr != nil {
				return nil, nil, telemetry.Error(ctx, span, gitErr, "error setting up git")
			}

			return nil, workflowYAML, nil
		}
	}

	// handle write to the database
	ga, err := config.Repo.GitActionConfig().CreateGitActionConfig(&models.GitActionConfig{
		ReleaseID:           release.ID,
		GitRepo:             request.GitRepo,
		GitBranch:           request.GitBranch,
		ImageRepoURI:        request.ImageRepoURI,
		GitRepoID:           request.GitRepoID,
		GitlabIntegrationID: request.GitlabIntegrationID,
		DockerfilePath:      request.DockerfilePath,
		FolderPath:          request.FolderPath,
		IsInstallation:      true,
		Version:             "v0.1.0",
	})
	if err != nil {
		return nil, nil, telemetry.Error(ctx, span, err, "error creating git action config")
	}

	// update the release in the db with the image repo uri
	release.ImageRepoURI = ga.ImageRepoURI

	_, err = config.Repo.Release().UpdateRelease(release)
	if err != nil {
		return nil, nil, telemetry.Error(ctx, span, err, "error updating release")
	}

	return ga.ToGitActionConfigType(), workflowYAML, gitErr
}

func getToken(
	ctx context.Context,
	config *config.Config,
	userID, projectID, clusterID uint,
	request *types.CreateGitActionConfigRequest,
) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-git-action-token")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: projectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: clusterID},
		telemetry.AttributeKV{Key: "user-id", Value: userID},
	)

	// create a policy for the token
	policy := []*types.PolicyDocument{
		{
			Scope: types.ProjectScope,
			Verbs: types.ReadWriteVerbGroup(),
			Children: map[types.PermissionScope]*types.PolicyDocument{
				types.ClusterScope: {
					Scope: types.ClusterScope,
					Verbs: types.ReadWriteVerbGroup(),
				},
				types.RegistryScope: {
					Scope: types.RegistryScope,
					Verbs: types.ReadVerbGroup(),
				},
				types.HelmRepoScope: {
					Scope: types.HelmRepoScope,
					Verbs: types.ReadVerbGroup(),
				},
			},
		},
	}

	uid, err := encryption.GenerateRandomBytes(16)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error generating uid")
	}

	policyBytes, err := json.Marshal(policy)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error marshalling policy into json")
	}

	policyModel := &models.Policy{
		ProjectID:       projectID,
		UniqueID:        uid,
		CreatedByUserID: userID,
		Name:            strings.ToLower(fmt.Sprintf("repo-%s-token-policy", request.GitRepo)),
		PolicyBytes:     policyBytes,
	}

	policyModel, err = config.Repo.Policy().CreatePolicy(policyModel)

	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error creating policy")
	}

	// create the token in the database
	tokenUID, err := encryption.GenerateRandomBytes(16)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error generating tokenUID")
	}

	secretKey, err := encryption.GenerateRandomBytes(16)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error generating secret key")
	}

	// hash the secret key for storage in the db
	hashedToken, err := bcrypt.GenerateFromPassword([]byte(secretKey), 8)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error generating hashedToken")
	}

	expiresAt := time.Now().Add(time.Hour * 24 * 365)

	apiToken := &models.APIToken{
		UniqueID:        tokenUID,
		ProjectID:       projectID,
		CreatedByUserID: userID,
		Expiry:          &expiresAt,
		Revoked:         false,
		PolicyUID:       policyModel.UniqueID,
		PolicyName:      policyModel.Name,
		Name:            strings.ToLower(fmt.Sprintf("repo-%s-token", request.GitRepo)),
		SecretKey:       hashedToken,
	}

	apiToken, err = config.Repo.APIToken().CreateAPIToken(apiToken)

	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error creating api token")
	}

	// generate porter jwt token
	jwt, err := token.GetStoredTokenForAPI(userID, projectID, apiToken.UniqueID, secretKey)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error getting stored token for api")
	}

	return jwt.EncodeToken(config.TokenConf)
}

func createBuildConfig(
	ctx context.Context,
	config *config.Config,
	release *models.Release,
	bcRequest *types.CreateBuildConfigRequest,
) (*types.BuildConfig, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-build-config")
	defer span.End()

	data, err := json.Marshal(bcRequest.Config)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error marshalling build config request")
	}

	// handle write to the database
	bc, err := config.Repo.BuildConfig().CreateBuildConfig(&models.BuildConfig{
		Builder:    bcRequest.Builder,
		Buildpacks: strings.Join(bcRequest.Buildpacks, ","),
		Config:     data,
	})
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error creating build config")
	}

	release.BuildConfig = bc.ID

	_, err = config.Repo.Release().UpdateRelease(release)
	if err != nil {
		return nil, telemetry.Error(ctx, span, err, "error updating release")
	}

	return bc.ToBuildConfigType(), nil
}

type containerEnvConfig struct {
	Container struct {
		Env struct {
			Normal map[string]string `yaml:"normal"`
		} `yaml:"env"`
	} `yaml:"container"`
}

func GetGARunner(
	ctx context.Context,
	config *config.Config,
	userID, projectID, clusterID uint,
	ga *models.GitActionConfig,
	name, namespace string,
	release *models.Release,
	helmRelease *release.Release,
) (*actions.GithubActions, error) {
	ctx, span := telemetry.NewSpan(ctx, "get-ga-runner")
	defer span.End()

	cEnv := &containerEnvConfig{}

	rawValues, err := yaml.Marshal(helmRelease.Config)
	if err == nil {
		err = yaml.Unmarshal(rawValues, cEnv)

		// if unmarshal error, just set to empty map
		if err != nil {
			cEnv.Container.Env.Normal = make(map[string]string)
		}
	}

	repoSplit := strings.Split(ga.GitRepo, "/")

	if len(repoSplit) != 2 {
		return nil, telemetry.Error(ctx, span, nil, "invalid formatting of repo name")
	}

	// create the commit in the git repo
	return &actions.GithubActions{
		ServerURL:              config.ServerConf.ServerURL,
		GithubOAuthIntegration: nil,
		BuildEnv:               cEnv.Container.Env.Normal,
		GithubAppID:            config.GithubAppConf.AppID,
		GithubAppSecretPath:    config.GithubAppConf.SecretPath,
		GithubInstallationID:   ga.GitRepoID,
		GitRepoName:            repoSplit[1],
		GitRepoOwner:           repoSplit[0],
		Repo:                   config.Repo,
		ProjectID:              projectID,
		ClusterID:              clusterID,
		ReleaseName:            name,
		GitBranch:              ga.GitBranch,
		DockerFilePath:         ga.DockerfilePath,
		FolderPath:             ga.FolderPath,
		ImageRepoURL:           ga.ImageRepoURI,
		Version:                "v0.1.0",
	}, nil
}
