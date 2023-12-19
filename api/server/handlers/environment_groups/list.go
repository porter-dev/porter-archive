package environment_groups

import (
	"net/http"
	"strings"
	"time"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	environmentgroups "github.com/porter-dev/porter/internal/kubernetes/environment_groups"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type ListEnvironmentGroupsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewListEnvironmentGroupsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListEnvironmentGroupsHandler {
	return &ListEnvironmentGroupsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// ListEnvironmentGroupsRequest is the request object for the /environment-groups endpoint
type ListEnvironmentGroupsRequest struct {
	// Type of the env group to filter by. If empty, all env groups will be returned.
	Type string `json:"type"`
}

type ListEnvironmentGroupsResponse struct {
	EnvironmentGroups []EnvironmentGroupListItem `json:"environment_groups,omitempty"`
}

type EnvironmentGroupListItem struct {
	Name               string            `json:"name"`
	Type               string            `json:"type"`
	LatestVersion      int               `json:"latest_version"`
	Variables          map[string]string `json:"variables,omitempty"`
	SecretVariables    map[string]string `json:"secret_variables,omitempty"`
	CreatedAtUTC       time.Time         `json:"created_at"`
	LinkedApplications []string          `json:"linked_applications,omitempty"`
}

func (c *ListEnvironmentGroupsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-env-groups")
	defer span.End()

	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	request := &ListEnvironmentGroupsRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "unable to decode or validate request body")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "env-group-type", Value: request.Type})

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to connect to cluster")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusServiceUnavailable))
		return
	}

	allEnvGroupVersions, err := environmentgroups.ListEnvironmentGroups(ctx, agent, environmentgroups.WithNamespace(environmentgroups.Namespace_EnvironmentGroups), environmentgroups.WithoutDefaultAppEnvironmentGroups(), environmentgroups.WithoutDefaultAddonEnvironmentGroups())
	if err != nil {
		err = telemetry.Error(ctx, span, err, "unable to list all environment groups")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if request.Type != "" {
		var filteredEnvGroupVersions []environmentgroups.EnvironmentGroup
		for _, envGroup := range allEnvGroupVersions {
			if envGroup.Type == request.Type {
				filteredEnvGroupVersions = append(filteredEnvGroupVersions, envGroup)
			}
		}
		allEnvGroupVersions = filteredEnvGroupVersions
	}

	envGroupSet := make(map[string]struct{})
	for _, envGroup := range allEnvGroupVersions {
		if envGroup.Name == "" {
			continue
		}
		if _, ok := envGroupSet[envGroup.Name]; !ok {
			envGroupSet[envGroup.Name] = struct{}{}
		}
	}

	var envGroups []EnvironmentGroupListItem
	for envGroupName := range envGroupSet {
		latestVersion, err := environmentgroups.LatestBaseEnvironmentGroup(ctx, agent, envGroupName)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "unable to get latest environment groups")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		var linkedApplications []string
		if !project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
			applications, err := environmentgroups.LinkedApplications(ctx, agent, latestVersion.Name, true)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "unable to get linked applications")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}

			applicationSetForEnvGroup := make(map[string]struct{})
			for _, app := range applications {
				if app.Namespace == "" {
					continue
				}
				if _, ok := applicationSetForEnvGroup[app.Namespace]; !ok {
					applicationSetForEnvGroup[app.Namespace] = struct{}{}
				}
			}
			for appNamespace := range applicationSetForEnvGroup {
				porterAppName := strings.TrimPrefix(appNamespace, "porter-stack-")
				linkedApplications = append(linkedApplications, porterAppName)
			}
		} else {
			applications, err := environmentgroups.LinkedApplications(ctx, agent, latestVersion.Name, false)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "unable to get linked applications")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}

			for _, app := range applications {
				linkedApplications = append(linkedApplications, app.Name)
			}
		}

		secrets := make(map[string]string)
		for k, v := range latestVersion.SecretVariables {
			secrets[k] = string(v)
		}
		envGroups = append(envGroups, EnvironmentGroupListItem{
			Name:               latestVersion.Name,
			Type:               latestVersion.Type,
			LatestVersion:      latestVersion.Version,
			Variables:          latestVersion.Variables,
			SecretVariables:    secrets,
			CreatedAtUTC:       latestVersion.CreatedAtUTC,
			LinkedApplications: linkedApplications,
		})
	}

	c.WriteResult(w, r, ListEnvironmentGroupsResponse{EnvironmentGroups: envGroups})
}
