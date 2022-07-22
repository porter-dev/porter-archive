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
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/stacks"
	helmrelease "helm.sh/helm/v3/pkg/release"
)

type StackAddApplicationHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewStackAddApplicationHandler(
	config *config.Config,
	reader shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StackAddApplicationHandler {
	return &StackAddApplicationHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, reader, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (p *StackAddApplicationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace, _ := r.Context().Value(types.NamespaceScope).(string)
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)

	req := &types.CreateStackAppResourceRequest{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
		return
	}

	if len(stack.Revisions) == 0 {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("no stack revisions exist"), http.StatusBadRequest,
		))
		return
	}

	latestRevision, err := p.Repo().Stack().ReadStackRevisionByNumber(stack.ID, stack.Revisions[0].RevisionNumber)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	newSourceConfigs, err := stacks.CloneSourceConfigs(latestRevision.SourceConfigs)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	appResources, err := stacks.CloneAppResources(latestRevision.Resources, latestRevision.SourceConfigs, newSourceConfigs)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	newResources, err := getResourceModels([]*types.CreateStackAppResourceRequest{req}, newSourceConfigs, p.Config().ServerConf.DefaultApplicationHelmRepoURL)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	appResources = append(appResources, newResources...)

	envGroups, err := stacks.CloneEnvGroups(latestRevision.EnvGroups)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	newRevision := &models.StackRevision{
		StackID:        stack.ID,
		RevisionNumber: latestRevision.RevisionNumber + 1,
		Status:         string(types.StackRevisionStatusDeploying),
		SourceConfigs:  newSourceConfigs,
		Resources:      appResources,
		EnvGroups:      envGroups,
	}

	revision, err := p.Repo().Stack().AppendNewRevision(newRevision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

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

	for _, appResource := range newResources {
		rel, err := applyAppResource(&applyAppResourceOpts{
			config:     p.Config(),
			projectID:  proj.ID,
			namespace:  namespace,
			cluster:    cluster,
			registries: registries,
			helmAgent:  helmAgent,
			request:    req,
		})

		if err != nil {
			deployErrs = append(deployErrs, err.Error())
		} else {
			helmReleaseMap[fmt.Sprintf("%s/%s", namespace, appResource.Name)] = rel
		}
	}

	// update stack revision status
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

		_, err = p.Repo().Stack().UpdateStackRevision(revision)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	} else {
		revision.Reason = "AddAppSuccess"
		revision.Message = "New application " + req.Name + " added successfully."

		_, err = p.Repo().Stack().UpdateStackRevision(revision)
		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
