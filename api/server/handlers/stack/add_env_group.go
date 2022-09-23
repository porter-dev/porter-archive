package stack

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
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/stacks"
)

type StackAddEnvGroupHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewStackAddEnvGroupHandler(
	config *config.Config,
	reader shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StackAddEnvGroupHandler {
	return &StackAddEnvGroupHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, reader, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (p *StackAddEnvGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace, _ := r.Context().Value(types.NamespaceScope).(string)
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)

	req := &types.CreateStackEnvGroupRequest{}

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

	envGroups, err := stacks.CloneEnvGroups(latestRevision.EnvGroups)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	newEnvGroups, err := getEnvGroupModels([]*types.CreateStackEnvGroupRequest{req}, proj.ID, cluster.ID, namespace)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envGroups = append(envGroups, newEnvGroups...)

	nameValidator := make(map[string]bool)

	for _, eg := range envGroups {
		if _, ok := nameValidator[eg.Name]; ok {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("duplicate env group name: %s", eg.Name),
				http.StatusBadRequest))
			return
		}

		nameValidator[eg.Name] = true
	}

	newRevision := &models.StackRevision{
		StackID:        stack.ID,
		RevisionNumber: latestRevision.RevisionNumber + 1,
		Status:         string(types.StackRevisionStatusDeployed),
		SourceConfigs:  newSourceConfigs,
		Resources:      appResources,
		EnvGroups:      envGroups,
	}

	revision, err := p.Repo().Stack().AppendNewRevision(newRevision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	k8sAgent, err := p.GetAgent(r, cluster, "")

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envGroupDeployErrors := make([]string, 0)

	cm, err := envgroup.CreateEnvGroup(k8sAgent, types.ConfigMapInput{
		Name:            req.Name,
		Namespace:       namespace,
		Variables:       req.Variables,
		SecretVariables: req.SecretVariables,
	})

	if err != nil {
		envGroupDeployErrors = append(envGroupDeployErrors, fmt.Sprintf("error creating env group %s", req.Name))
	}

	// add each of the linked applications to the env group
	for _, appName := range req.LinkedApplications {
		cm, err = k8sAgent.AddApplicationToVersionedConfigMap(cm, appName)

		if err != nil {
			envGroupDeployErrors = append(envGroupDeployErrors, fmt.Sprintf("error creating env group %s", req.Name))
		}
	}

	if len(envGroupDeployErrors) > 0 {
		revision.Status = string(types.StackRevisionStatusFailed)
		revision.Reason = "EnvGroupDeployErr"
		revision.Message = strings.Join(envGroupDeployErrors, " , ")
	} else {
		revision.Status = string(types.StackRevisionStatusDeployed)
		revision.Reason = "AddEnvGroupSuccess"
		revision.Message = "Env Group " + req.Name + " added successfully."
	}

	_, err = p.Repo().Stack().UpdateStackRevision(revision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
