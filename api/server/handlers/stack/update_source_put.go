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

type StackPutSourceConfigHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewStackPutSourceConfigHandler(
	config *config.Config,
	reader shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *StackPutSourceConfigHandler {
	return &StackPutSourceConfigHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, reader, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (p *StackPutSourceConfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace, _ := r.Context().Value(types.NamespaceScope).(string)
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)

	helmAgent, err := p.GetHelmAgent(r, cluster, "")

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	req := &types.PutStackSourceConfigRequest{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// read the latest revision
	revision, err := p.Repo().Stack().ReadStackRevisionByNumber(stack.ID, stack.Revisions[0].RevisionNumber)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	sourceConfigs, err := getSourceConfigModels(req.SourceConfigs)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// clear out model data and create new revision
	revision.Model = gorm.Model{}
	revision.RevisionNumber++
	revision.Status = string(types.StackRevisionStatusDeploying)
	prevSourceConfigs := revision.SourceConfigs
	revision.SourceConfigs = sourceConfigs
	clonedAppResources, err := stacks.CloneAppResources(revision.Resources, prevSourceConfigs, revision.SourceConfigs)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	revision.Resources = clonedAppResources

	revision, err = p.Repo().Stack().AppendNewRevision(revision)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// apply to cluster
	registries, err := p.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	deployErrs := make([]string, 0)

	// read the stack again to get the latest revision info
	stack, err = p.Repo().Stack().ReadStackByStringID(proj.ID, stack.UID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	for i, appResource := range clonedAppResources {
		// get the corresponding source config tag
		var imageTag string

		for _, sourceConfig := range sourceConfigs {
			if sourceConfig.UID == appResource.StackSourceConfigUID {
				imageTag = sourceConfig.ImageTag
			}
		}

		// TODO: case on if image tag is empty

		err = updateAppResourceTag(&updateAppResourceTagOpts{
			helmAgent:     helmAgent,
			name:          appResource.Name,
			tag:           imageTag,
			config:        p.Config(),
			projectID:     proj.ID,
			namespace:     namespace,
			cluster:       cluster,
			registries:    registries,
			stackName:     stack.Name,
			stackRevision: stack.Revisions[0].RevisionNumber,
		})

		if err != nil {
			deployErrs = append(deployErrs, err.Error())
		}

		clonedAppResources[i].HelmRevisionID++
	}

	if len(deployErrs) > 0 {
		revision.Status = string(types.StackRevisionStatusFailed)
		revision.Reason = "DeployError"
		revision.Message = fmt.Sprintf("Error while updating source configuration: %s", strings.Join(deployErrs, " , "))
	} else {
		revision.Status = string(types.StackRevisionStatusDeployed)
		revision.Reason = "SourceConfigUpdate"
		revision.Message = fmt.Sprintf("The source configuration was updated")
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
