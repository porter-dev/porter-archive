package stack

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/stacks"
)

type StackRemoveApplicationHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewStackRemoveApplicationHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *StackRemoveApplicationHandler {
	return &StackRemoveApplicationHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (p *StackRemoveApplicationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace, _ := r.Context().Value(types.NamespaceScope).(string)

	appResourceName, reqErr := requestutils.GetURLParamString(r, "app_resource_name")

	if reqErr != nil {
		p.HandleAPIError(w, r, reqErr)
		return
	}

	if len(stack.Revisions) == 0 {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("no stack revisions exist"), http.StatusBadRequest,
		))
		return
	}

	revision, err := p.Repo().Stack().ReadStackRevisionByNumber(stack.ID, stack.Revisions[0].RevisionNumber)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	newSourceConfigs, err := stacks.CloneSourceConfigs(revision.SourceConfigs)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	appResources, err := stacks.CloneAppResources(revision.Resources, revision.SourceConfigs, newSourceConfigs)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	envGroups, err := stacks.CloneEnvGroups(revision.EnvGroups)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var newResources []models.StackResource

	for _, res := range appResources {
		if res.Name != appResourceName {
			newResources = append(newResources, res)
		}
	}

	newRevision := &models.StackRevision{
		StackID:        stack.ID,
		RevisionNumber: revision.RevisionNumber + 1,
		Status:         string(types.StackRevisionStatusDeploying),
		SourceConfigs:  newSourceConfigs,
		Resources:      newResources,
		EnvGroups:      envGroups,
	}

	revision, err = p.Repo().Stack().AppendNewRevision(newRevision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	helmAgent, err := p.GetHelmAgent(r, cluster, namespace)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	err = deleteAppResource(&deleteAppResourceOpts{
		helmAgent: helmAgent,
		name:      appResourceName,
	})

	if err == nil {
		revision.Status = string(types.StackRevisionStatusDeployed)
		revision.Reason = "RemoveAppSuccess"
		revision.Message = "Application " + appResourceName + " removed successfully"
	} else {
		revision.Status = string(types.StackRevisionStatusFailed)
		revision.Reason = "RemoveAppError"
		revision.Message = err.Error()
	}

	_, err = p.Repo().Stack().UpdateStackRevision(revision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
