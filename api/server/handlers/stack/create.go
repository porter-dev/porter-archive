package stack

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/release"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"

	helmrelease "helm.sh/helm/v3/pkg/release"
)

type StackCreateHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewStackCreateHandler(
	config *config.Config,
	reader shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StackCreateHandler {
	return &StackCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, reader, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (p *StackCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace, _ := r.Context().Value(types.NamespaceScope).(string)

	req := &types.CreateStackRequest{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// populate fields with defaults
	for i, reqResource := range req.AppResources {
		if reqResource.TemplateRepoURL == "" {
			req.AppResources[i].TemplateRepoURL = p.Config().ServerConf.DefaultApplicationHelmRepoURL
		}
	}

	uid, err := encryption.GenerateRandomBytes(16)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	sourceConfigs, err := getSourceConfigModels(req.SourceConfigs)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	resources, err := getResourceModels(req.AppResources, sourceConfigs, p.Config().ServerConf.DefaultApplicationHelmRepoURL)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// write stack to the database with creating status
	stack := &models.Stack{
		ProjectID: proj.ID,
		ClusterID: cluster.ID,
		Namespace: namespace,
		Name:      req.Name,
		UID:       uid,
		Revisions: []models.StackRevision{
			{
				RevisionNumber: 1,
				Status:         string(types.StackRevisionStatusDeploying),
				SourceConfigs:  sourceConfigs,
				Resources:      resources,
			},
		},
	}

	stack, err = p.Repo().Stack().CreateStack(stack)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// apply all app resources
	registries, err := p.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	helmAgent, err := p.GetHelmAgent(r, cluster, "")

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	helmReleaseMap := make(map[string]*helmrelease.Release)

	deployErrs := make([]string, 0)

	for _, appResource := range req.AppResources {
		rel, err := applyAppResource(&applyAppResourceOpts{
			config:     p.Config(),
			projectID:  proj.ID,
			namespace:  namespace,
			cluster:    cluster,
			registries: registries,
			helmAgent:  helmAgent,
			request:    appResource,
		})

		if err != nil {
			deployErrs = append(deployErrs, err.Error())
		} else {
			helmReleaseMap[fmt.Sprintf("%s/%s", namespace, appResource.Name)] = rel
		}
	}

	// update stack revision status
	revision := &stack.Revisions[0]

	if len(deployErrs) > 0 {
		revision.Status = string(types.StackRevisionStatusFailed)
		revision.Reason = "DeployError"
		revision.Message = strings.Join(deployErrs, " , ")
	} else {
		revision.Status = string(types.StackRevisionStatusDeployed)
	}

	revision, err = p.Repo().Stack().UpdateStackRevision(revision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	saveErrs := make([]string, 0)

	for _, resource := range revision.Resources {
		if rel, exists := helmReleaseMap[fmt.Sprintf("%s/%s", namespace, resource.Name)]; exists {
			_, err = release.CreateAppReleaseFromHelmRelease(p.Config(), proj.ID, cluster.ID, resource.ID, rel)

			if err != nil {
				saveErrs = append(saveErrs, fmt.Sprintf("the resource %s/%s could not be saved right now", namespace, resource.Name))
			}
		}
	}

	if len(saveErrs) > 0 {
		revision.Reason = "SaveError"
		revision.Message = strings.Join(saveErrs, " , ")

		revision, err = p.Repo().Stack().UpdateStackRevision(revision)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	// read the stack again to get the latest revision info
	stack, err = p.Repo().Stack().ReadStackByStringID(proj.ID, stack.UID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	w.WriteHeader(http.StatusCreated)
	p.WriteResult(w, r, stack.ToStackType())
}

func getSourceConfigModels(sourceConfigs []*types.CreateStackSourceConfigRequest) ([]models.StackSourceConfig, error) {
	res := make([]models.StackSourceConfig, 0)

	// for now, only write source configs which are deployed as a docker image
	// TODO: add parsing/writes for git-based sources
	for _, sourceConfig := range sourceConfigs {
		if sourceConfig.StackSourceConfigBuild == nil {
			uid, err := encryption.GenerateRandomBytes(16)

			if err != nil {
				return nil, err
			}

			res = append(res, models.StackSourceConfig{
				UID:          uid,
				Name:         sourceConfig.Name,
				ImageRepoURI: sourceConfig.ImageRepoURI,
				ImageTag:     sourceConfig.ImageTag,
			})
		}
	}

	return res, nil
}

func getResourceModels(appResources []*types.CreateStackAppResourceRequest, sourceConfigs []models.StackSourceConfig, defaultRepoURL string) ([]models.StackResource, error) {
	res := make([]models.StackResource, 0)

	for _, appResource := range appResources {
		uid, err := encryption.GenerateRandomBytes(16)

		if err != nil {
			return nil, err
		}

		var linkedSourceConfigUID string

		for _, sourceConfig := range sourceConfigs {
			if sourceConfig.Name == appResource.SourceConfigName {
				linkedSourceConfigUID = sourceConfig.UID
			}
		}

		if linkedSourceConfigUID == "" {
			return nil, fmt.Errorf("source config %s does not exist in source config list", appResource.SourceConfigName)
		}

		res = append(res, models.StackResource{
			Name:                 appResource.Name,
			UID:                  uid,
			StackSourceConfigUID: linkedSourceConfigUID,
			TemplateRepoURL:      appResource.TemplateRepoURL,
			TemplateName:         appResource.TemplateName,
			TemplateVersion:      appResource.TemplateVersion,
			HelmRevisionID:       1,
		})
	}

	return res, nil
}
