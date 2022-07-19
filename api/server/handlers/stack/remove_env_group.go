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
	"github.com/porter-dev/porter/internal/kubernetes/envgroup"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/stacks"
)

type StackRemoveEnvGroupHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewStackRemoveEnvGroupHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *StackRemoveEnvGroupHandler {
	return &StackRemoveEnvGroupHandler{
		PorterHandlerWriter:   handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter: authz.NewOutOfClusterAgentGetter(config),
	}
}

func (p *StackRemoveEnvGroupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	envGroupName, reqErr := requestutils.GetURLParamString(r, "env_group_name")

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

	var newEnvGroups []models.StackEnvGroup
	var envGroupNS string

	for _, envGroup := range envGroups {
		if envGroup.Name != envGroupName {
			newEnvGroups = append(newEnvGroups, envGroup)
		} else {
			envGroupNS = envGroup.Namespace
		}
	}

	newRevision := &models.StackRevision{
		StackID:        stack.ID,
		RevisionNumber: revision.RevisionNumber + 1,
		Status:         string(types.StackRevisionStatusDeploying),
		SourceConfigs:  newSourceConfigs,
		Resources:      appResources,
		EnvGroups:      newEnvGroups,
	}

	revision, err = p.Repo().Stack().AppendNewRevision(newRevision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	k8sAgent, err := p.GetAgent(r, cluster, "")

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	err = envgroup.DeleteEnvGroup(k8sAgent, envGroupName, envGroupNS)

	if err == nil {
		revision.Status = string(types.StackRevisionStatusDeployed)
		revision.Reason = "RemoveEnvGroupSuccess"
		revision.Message = "EnvGroup " + envGroupName + " removed successfully"
	} else {
		revision.Status = string(types.StackRevisionStatusFailed)
		revision.Reason = "RemoveEnvGroupError"
		revision.Message = err.Error()
	}

	_, err = p.Repo().Stack().UpdateStackRevision(revision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
