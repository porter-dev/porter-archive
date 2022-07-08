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
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/stacks"
	"gorm.io/gorm"
)

type StackRollbackHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewStackRollbackHandler(
	config *config.Config,
	reader shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StackRollbackHandler {
	return &StackRollbackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, reader, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (p *StackRollbackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	helmAgent, err := p.GetHelmAgent(r, cluster, "")

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	// namespace, _ := r.Context().Value(types.NamespaceScope).(string)
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)

	req := &types.StackRollbackRequest{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// read the target revision
	revision, err := p.Repo().Stack().ReadStackRevisionByNumber(stack.ID, req.TargetRevision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// read the latest revision
	latestRevision, err := p.Repo().Stack().ReadStackRevisionByNumber(stack.ID, stack.Revisions[0].RevisionNumber)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// clear out model data and create new revision
	revision.Model = gorm.Model{}
	revision.RevisionNumber = latestRevision.RevisionNumber + 1
	revision.Status = string(types.StackRevisionStatusDeploying)

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

	revision.SourceConfigs = newSourceConfigs
	revision.Resources = appResources
	revision.EnvGroups = envGroups

	revision, err = p.Repo().Stack().AppendNewRevision(revision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// apply to cluster
	rollbackErrors := make([]string, 0)

	for _, resource := range revision.Resources {
		err := rollbackAppResource(&rollbackAppResourceOpts{
			helmAgent:      helmAgent,
			helmRevisionID: resource.HelmRevisionID,
			name:           resource.Name,
		})

		if err != nil {
			rollbackErrors = append(rollbackErrors, err.Error())
		}
	}

	if len(rollbackErrors) > 0 {
		revision.Status = string(types.StackRevisionStatusFailed)
		revision.Reason = "RollbackError"
		revision.Message = fmt.Sprintf("Error while rolling back to version %d: %s", req.TargetRevision, strings.Join(rollbackErrors, " , "))
	} else {
		revision.Status = string(types.StackRevisionStatusDeployed)
		revision.Reason = "Rollback"
		revision.Message = fmt.Sprintf("The stack was rolled back to version %d", req.TargetRevision)
	}

	revision, err = p.Repo().Stack().UpdateStackRevision(revision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// read the stack again to get the latest revision info
	stack, err = p.Repo().Stack().ReadStackByStringID(proj.ID, stack.UID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, stack.ToStackType())
}
