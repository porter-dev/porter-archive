package environment_groups

import (
	"net/http"
	"strings"
	"time"

	"connectrpc.com/connect"

	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

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

type EnvironmentGroupFile struct {
	Name     string `json:"name"`
	Contents string `json:"contents"`
}

type EnvironmentGroupListItem struct {
	Name               string                 `json:"name"`
	Type               string                 `json:"type"`
	LatestVersion      int                    `json:"latest_version"`
	Variables          map[string]string      `json:"variables,omitempty"`
	SecretVariables    map[string]string      `json:"secret_variables,omitempty"`
	CreatedAtUTC       time.Time              `json:"created_at"`
	LinkedApplications []string               `json:"linked_applications,omitempty"`
	Files              []EnvironmentGroupFile `json:"files,omitempty"`
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

	if project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		listEnvGroupsReq := connect.NewRequest(&porterv1.ListEnvGroupsRequest{
			ProjectId:      int64(project.ID),
			ClusterId:      int64(cluster.ID),
			IncludeSecrets: false,
		})

		listEnvGroupResp, err := c.Config().ClusterControlPlaneClient.ListEnvGroups(ctx, listEnvGroupsReq)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "unable to get linked applications")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
		if listEnvGroupResp == nil || listEnvGroupResp.Msg == nil {
			err = telemetry.Error(ctx, span, err, "ccp resp is nil")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		var envGroups []EnvironmentGroupListItem
		for _, envGroup := range listEnvGroupResp.Msg.EnvGroups {
			envGroups = append(envGroups, EnvironmentGroupListItem{
				Name:               envGroup.Name,
				Type:               translateProtoTypeToEnvGroupType[envGroup.Type],
				LatestVersion:      int(envGroup.Version),
				Variables:          envGroup.Variables,
				SecretVariables:    envGroup.SecretVariables,
				CreatedAtUTC:       envGroup.CreatedAt.AsTime(),
				LinkedApplications: envGroup.LinkedApplications,
			})
		}

		// return early for cleaner change
		c.WriteResult(w, r, ListEnvironmentGroupsResponse{EnvironmentGroups: envGroups})
		return
	}

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

var translateProtoTypeToEnvGroupType = map[porterv1.EnumEnvGroupProviderType]string{
	porterv1.EnumEnvGroupProviderType_ENUM_ENV_GROUP_PROVIDER_TYPE_DATASTORE: "datastore",
	porterv1.EnumEnvGroupProviderType_ENUM_ENV_GROUP_PROVIDER_TYPE_DOPPLER:   "doppler",
	porterv1.EnumEnvGroupProviderType_ENUM_ENV_GROUP_PROVIDER_TYPE_PORTER:    "porter",
}
