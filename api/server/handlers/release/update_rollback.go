package release

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"helm.sh/helm/v3/pkg/release"
)

type RollbackReleaseHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewRollbackReleaseHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RollbackReleaseHandler {
	return &RollbackReleaseHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *RollbackReleaseHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	helmRelease, _ := r.Context().Value(types.ReleaseScope).(*release.Release)

	helmAgent, err := c.GetHelmAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.RollbackReleaseRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	err = helmAgent.RollbackRelease(helmRelease.Name, request.Revision)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error rolling back release: %s", err.Error()),
			http.StatusBadRequest,
		))

		return
	}

	// update the github actions env if the release exists and is built from source
	if cName := helmRelease.Chart.Metadata.Name; cName == "job" || cName == "web" || cName == "worker" {
		rel, err := c.Repo().Release().ReadRelease(cluster.ID, helmRelease.Name, helmRelease.Namespace)

		if err == nil && rel != nil {
			err = updateReleaseRepo(c.Config(), rel, helmRelease)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			gitAction := rel.GitActionConfig

			if gitAction != nil && gitAction.ID != 0 {
				err = updateGitActionEnvSecret(
					c.Config(),
					user.ID,
					cluster.ProjectID,
					cluster.ID,
					rel.GitActionConfig,
					helmRelease.Name,
					helmRelease.Namespace,
					rel,
					helmRelease,
				)

				if err != nil {
					c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
					return
				}
			}
		}
	}
}

func updateReleaseRepo(config *config.Config, release *models.Release, helmRelease *release.Release) error {
	repository := helmRelease.Config["image"].(map[string]interface{})["repository"]
	repoStr, ok := repository.(string)

	if !ok {
		return fmt.Errorf("Could not find field repository in config")
	}

	if repoStr != release.ImageRepoURI {
		release.ImageRepoURI = repoStr
		_, err := config.Repo.Release().UpdateRelease(release)

		if err != nil {
			return err
		}
	}

	return nil
}

// // HandleRollbackRelease rolls a release back to a specified revision
// func (app *App) HandleRollbackRelease(w http.ResponseWriter, r *http.Request) {
// 	name := chi.URLParam(r, "name")

// 	vals, err := url.ParseQuery(r.URL.RawQuery)

// 	if err != nil {
// 		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
// 		return
// 	}

// 	form := &forms.RollbackReleaseForm{
// 		ReleaseForm: &forms.ReleaseForm{
// 			Form: &helm.Form{
// 				Repo:              app.Repo,
// 				DigitalOceanOAuth: app.DOConf,
// 			},
// 		},
// 		Name: name,
// 	}

// 	form.ReleaseForm.PopulateHelmOptionsFromQueryParams(
// 		vals,
// 		app.Repo.Cluster(),
// 	)

// 	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
// 		app.handleErrorFormDecoding(err, ErrUserDecode, w)
// 		return
// 	}

// 	agent, err := app.getAgentFromReleaseForm(
// 		w,
// 		r,
// 		form.ReleaseForm,
// 	)

// 	// errors are handled in app.getAgentFromBodyParams
// 	if err != nil {
// 		return
// 	}

// 	err = agent.RollbackRelease(form.Name, form.Revision)

// 	if err != nil {
// 		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
// 			Code:   ErrReleaseDeploy,
// 			Errors: []string{"error rolling back release " + err.Error()},
// 		}, w)

// 		return
// 	}

// 	// get the full release data for GHA updating
// 	rel, err := agent.GetRelease(form.Name, form.Revision)

// 	if err != nil {
// 		app.sendExternalError(err, http.StatusNotFound, HTTPError{
// 			Code:   ErrReleaseReadData,
// 			Errors: []string{"release not found"},
// 		}, w)

// 		return
// 	}

// 	// update the github actions env if the release exists and is built from source
// 	if cName := rel.Chart.Metadata.Name; cName == "job" || cName == "web" || cName == "worker" {
// 		clusterID, err := strconv.ParseUint(vals["cluster_id"][0], 10, 64)

// 		if err != nil {
// 			app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
// 				Code:   ErrReleaseReadData,
// 				Errors: []string{"release not found"},
// 			}, w)

// 			return
// 		}

// 		release, err := app.Repo.Release().ReadRelease(uint(clusterID), name, rel.Namespace)

// 		if release != nil {
// 			// update image repo uri if changed
// 			repository := rel.Config["image"].(map[string]interface{})["repository"]
// 			repoStr, ok := repository.(string)

// 			if !ok {
// 				app.handleErrorInternal(fmt.Errorf("Could not find field repository in config"), w)
// 				return
// 			}

// 			if repoStr != release.ImageRepoURI {
// 				release, err = app.Repo.Release().UpdateRelease(release)

// 				if err != nil {
// 					app.handleErrorInternal(err, w)
// 					return
// 				}
// 			}

// 			gitAction := release.GitActionConfig

// 			if gitAction.ID != 0 {
// 				// parse env into build env
// 				cEnv := &ContainerEnvConfig{}
// 				rawValues, err := yaml.Marshal(rel.Config)

// 				if err != nil {
// 					app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
// 						Code:   ErrReleaseReadData,
// 						Errors: []string{"could not get values of previous revision"},
// 					}, w)
// 				}

// 				yaml.Unmarshal(rawValues, cEnv)

// 				gr, err := app.Repo.GitRepo().ReadGitRepo(gitAction.GitRepoID)

// 				if err != nil {
// 					if err != gorm.ErrRecordNotFound {
// 						app.handleErrorInternal(err, w)
// 						return
// 					}
// 					gr = nil
// 				}

// 				repoSplit := strings.Split(gitAction.GitRepo, "/")

// 				projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

// 				if err != nil || projID == 0 {
// 					app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 					return
// 				}

// 				gaRunner := &actions.GithubActions{
// 					ServerURL:              app.ServerConf.ServerURL,
// 					GithubOAuthIntegration: gr,
// 					GithubInstallationID:   gitAction.GithubInstallationID,
// 					GithubAppID:            app.GithubAppConf.AppID,
// 					GithubAppSecretPath:    app.GithubAppConf.SecretPath,
// 					GitRepoName:            repoSplit[1],
// 					GitRepoOwner:           repoSplit[0],
// 					Repo:                   app.Repo,
// 					GithubConf:             app.GithubProjectConf,
// 					ProjectID:              uint(projID),
// 					ReleaseName:            name,
// 					GitBranch:              gitAction.GitBranch,
// 					DockerFilePath:         gitAction.DockerfilePath,
// 					FolderPath:             gitAction.FolderPath,
// 					ImageRepoURL:           gitAction.ImageRepoURI,
// 					BuildEnv:               cEnv.Container.Env.Normal,
// 					ClusterID:              release.ClusterID,
// 					Version:                gitAction.Version,
// 				}

// 				actionVersion, err := semver.NewVersion(gaRunner.Version)
// 				if err != nil {
// 					app.handleErrorInternal(err, w)
// 				}

// 				if createEnvSecretConstraint.Check(actionVersion) {
// 					if err := gaRunner.CreateEnvSecret(); err != nil {
// 						app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
// 							Code:   ErrReleaseReadData,
// 							Errors: []string{"could not update github secret"},
// 						}, w)
// 					}
// 				}
// 			}
// 		}
// 	}

// 	w.WriteHeader(http.StatusOK)
// }
