package environment

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"strings"

	"github.com/porter-dev/porter/internal/telemetry"

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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-update-environment-settings")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	envID, reqErr := requestutils.GetURLParamUint(r, "environment_id")

	if reqErr != nil {
		_ = telemetry.Error(ctx, span, reqErr, "could not get environment id from url")
		c.HandleAPIError(w, r, reqErr)
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "environment-id", Value: envID})

	request := &types.UpdateEnvironmentSettingsRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		_ = telemetry.Error(ctx, span, nil, "could not decode and validate request")
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "mode", Value: request.Mode},
		telemetry.AttributeKV{Key: "git-repo-branches", Value: request.GitRepoBranches},
		telemetry.AttributeKV{Key: "git-deploy-branches", Value: request.GitDeployBranches},
	)

	env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, envID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "could not read environment by id")

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

	newBranches = []string{}

	for _, br := range request.GitDeployBranches {
		name := strings.TrimSpace(br)

		if len(name) > 0 {
			newBranches = append(newBranches, name)
		}
	}

	changed = !reflect.DeepEqual(env.ToEnvironmentType().GitDeployBranches, newBranches)

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "changed", Value: changed})

	if changed {
		// let us check if the webhook has access to the "push" event
		client, err := getGithubClientFromEnvironment(c.Config(), env)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "could not get github client")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		hook, _, err := client.Repositories.GetHook(
			context.Background(), env.GitRepoOwner, env.GitRepoName, env.GithubWebhookID,
		)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "could not get hook")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		found := false

		for _, ev := range hook.Events {
			if ev == "push" {
				found = true
				break
			}
		}

		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "found", Value: found})

		if !found {
			hook.Events = append(hook.Events, "push")

			_, _, err := client.Repositories.EditHook(
				context.Background(), env.GitRepoOwner, env.GitRepoName, env.GithubWebhookID, hook,
			)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "could not edit hook")
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
		}

		env.GitDeployBranches = strings.Join(request.GitDeployBranches, ",")

		if len(request.GitDeployBranches) > 0 && c.Config().ServerConf.EnableAutoPreviewBranchDeploy {
			errs := autoDeployBranch(env, c.Config(), request.GitDeployBranches, true)

			if len(errs) > 0 {
				errString := errs[0].Error()

				for _, e := range errs {
					errString += ": " + e.Error()
				}

				_ = telemetry.Error(ctx, span, errors.New(errString), "could not auto deploy branch")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
					fmt.Errorf("error auto deploying preview branches: %s", errString), http.StatusConflict),
				)
				return
			}
		}
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
			err = telemetry.Error(ctx, span, err, "could not update environment")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	c.WriteResult(w, r, env.ToEnvironmentType())
}
