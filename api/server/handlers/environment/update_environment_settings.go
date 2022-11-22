package environment

import (
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type UpdateEnvironmentSettingsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdateEnvironmentSettingsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateEnvironmentSettingsHandler {
	return &UpdateEnvironmentSettingsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *UpdateEnvironmentSettingsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	envID, reqErr := requestutils.GetURLParamUint(r, "environment_id")

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	request := &types.UpdateEnvironmentSettingsRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, envID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(fmt.Errorf("no such environment with ID: %d", envID)))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var newBranches []string

	for _, br := range request.GitRepoBranches {
		name := strings.TrimSpace(br)

		if len(name) > 0 {
			newBranches = append(newBranches, name)
		}
	}

	changed := !reflect.DeepEqual(env.ToEnvironmentType().GitRepoBranches, newBranches)

	if changed {
		env.GitRepoBranches = strings.Join(request.GitRepoBranches, ",")
	}

	if request.DisableNewComments != env.NewCommentsDisabled {
		env.NewCommentsDisabled = request.DisableNewComments
		changed = true
	}

	if request.Mode != env.Mode {
		env.Mode = request.Mode
		changed = true
	}

	if len(request.NamespaceLabels) > 0 {
		var labels []string

		for k, v := range request.NamespaceLabels {
			labels = append(labels, fmt.Sprintf("%s=%s", k, v))
		}

		env.NamespaceLabels = []byte(strings.Join(labels, ","))

		changed = true
	} else {
		env.NamespaceLabels = []byte{}

		changed = true
	}

	if changed {
		env, err = c.Repo().Environment().UpdateEnvironment(env)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	c.WriteResult(w, r, env.ToEnvironmentType())
}
