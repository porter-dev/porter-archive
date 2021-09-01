package release

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/registry"
	"github.com/porter-dev/porter/internal/repository"
	"helm.sh/helm/v3/pkg/release"
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

	helmAgent, err := c.GetHelmAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.CreateReleaseRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	chart, err := loader.LoadChartPublic(request.RepoURL, request.TemplateName, request.TemplateVersion)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	conf := &helm.InstallChartConfig{
		Chart:      chart,
		Name:       request.Name,
		Namespace:  namespace,
		Values:     request.Values,
		Cluster:    cluster,
		Repo:       c.Repo(),
		Registries: registries,
	}

	helmRelease, err := helmAgent.InstallChart(conf, c.Config().DOConf)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error installing a new chart: %s", err.Error()),
			http.StatusBadRequest,
		))

		return
	}

	release, err := createReleaseFromHelmRelease(c.Config(), cluster.ProjectID, cluster.ID, helmRelease)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if request.GithubActionConfig != nil {
		_, _, err := createGitAction(
			c.Config(),
			user.ID,
			cluster.ProjectID,
			cluster.ID,
			request.GithubActionConfig,
			request.Name,
			namespace,
			release,
		)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}

func createReleaseFromHelmRelease(
	config *config.Config,
	projectID, clusterID uint,
	helmRelease *release.Release,
) (*models.Release, error) {
	token, err := repository.GenerateRandomBytes(16)

	if err != nil {
		return nil, err
	}

	// create release with webhook token in db
	image, ok := helmRelease.Config["image"].(map[string]interface{})

	if !ok {
		return nil, fmt.Errorf("Could not find field image in config")
	}

	repository := image["repository"]
	repoStr, ok := repository.(string)

	if !ok {
		return nil, fmt.Errorf("Could not find field repository in config")
	}

	release := &models.Release{
		ClusterID:    clusterID,
		ProjectID:    projectID,
		Namespace:    helmRelease.Namespace,
		Name:         helmRelease.Name,
		WebhookToken: token,
		ImageRepoURI: repoStr,
	}

	return config.Repo.Release().CreateRelease(release)
}

func createGitAction(
	config *config.Config,
	userID, projectID, clusterID uint,
	request *types.CreateGitActionConfigRequest,
	name, namespace string,
	release *models.Release,
) (*types.GitActionConfig, []byte, error) {
	// if the registry was provisioned through Porter, create a repository if necessary
	if request.RegistryID != 0 {
		// read the registry
		reg, err := config.Repo.Registry().ReadRegistry(projectID, request.RegistryID)

		if err != nil {
			return nil, nil, err
		}

		_reg := registry.Registry(*reg)
		regAPI := &_reg

		// parse the name from the registry
		nameSpl := strings.Split(request.ImageRepoURI, "/")
		repoName := nameSpl[len(nameSpl)-1]

		err = regAPI.CreateRepository(config.Repo, repoName)

		if err != nil {
			return nil, nil, err
		}
	}

	repoSplit := strings.Split(request.GitRepo, "/")

	if len(repoSplit) != 2 {
		return nil, nil, fmt.Errorf("invalid formatting of repo name")
	}

	// generate porter jwt token
	jwt, err := token.GetTokenForAPI(userID, projectID)

	if err != nil {
		return nil, nil, err
	}

	encoded, err := jwt.EncodeToken(config.TokenConf)

	if err != nil {
		return nil, nil, err
	}

	// create the commit in the git repo
	gaRunner := &actions.GithubActions{
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
		GitBranch:              request.GitBranch,
		DockerFilePath:         request.DockerfilePath,
		FolderPath:             request.FolderPath,
		ImageRepoURL:           request.ImageRepoURI,
		PorterToken:            encoded,
		Version:                "v0.1.0",
		ShouldCreateWorkflow:   request.ShouldCreateWorkflow,
	}

	workflowYAML, err := gaRunner.Setup()

	if err != nil {
		return nil, nil, err
	}

	if !request.ShouldCreateWorkflow {
		return nil, workflowYAML, nil
	}

	// handle write to the database
	ga, err := config.Repo.GitActionConfig().CreateGitActionConfig(&models.GitActionConfig{
		ReleaseID:    release.ID,
		GitRepo:      request.GitRepo,
		GitBranch:    request.GitBranch,
		ImageRepoURI: request.ImageRepoURI,
		// TODO: github installation id here?
		GitRepoID:      request.GitRepoID,
		DockerfilePath: request.DockerfilePath,
		FolderPath:     request.FolderPath,
		IsInstallation: true,
		Version:        "v0.1.0",
	})

	if err != nil {
		return nil, nil, err
	}

	// update the release in the db with the image repo uri
	release.ImageRepoURI = ga.ImageRepoURI

	_, err = config.Repo.Release().UpdateRelease(release)

	if err != nil {
		return nil, nil, err
	}

	return ga.ToGitActionConfigType(), workflowYAML, nil
}
