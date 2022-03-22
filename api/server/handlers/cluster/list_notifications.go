package cluster

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifications"
	"gopkg.in/yaml.v2"
)

type ListNotificationsHandler struct {
	*notifications.NotificationsManager
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewListNotificationsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListNotificationsHandler {
	return &ListNotificationsHandler{
		NotificationsManager:    notifications.NewNotificationsManager(config),
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *ListNotificationsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	helmAgent, err := c.GetHelmAgent(r, cluster, "monitoring")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	values, err := helmAgent.GetValues("prometheus", false)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	backends := c.GetBackends()
	resp := &types.ListNotificationsResponse{}

	var prometheusBackendResp *types.NotificationsBackendResponse

	for _, val := range backends {
		backend := &types.NotificationsBackendResponse{
			Name: val.Name(),
		}

		if val.Name() == "prometheus" {
			prometheusBackendResp = backend
		}

		for _, action := range val.Actions() {
			backend.Actions = append(backend.Actions, action)
		}

		resp.Backends = append(resp.Backends, backend)
	}

	ruleGroupsMap, err := getNestedMap(values, "serverFiles", "alerting_rules.yml")

	if err == nil {
		bytes, err := yaml.Marshal(ruleGroupsMap)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		ruleGroups := &notifications.PrometheusRuleGroups{}

		err = yaml.Unmarshal(bytes, ruleGroups)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		activeRulesMap := make(map[string]bool)

		for _, rule := range ruleGroups.Groups[0].Rules {
			activeRulesMap[rule.Alert] = true
		}

		for _, action := range prometheusBackendResp.Actions {
			if _, ok := activeRulesMap[action.ID]; ok {
				if action.Type == "toggle" {
					action.Value = true
				}
			}
		}
	}

	c.WriteResult(w, r, resp)
}

type NestedMapFieldNotFoundError struct {
	Field string
}

func (e *NestedMapFieldNotFoundError) Error() string {
	return fmt.Sprintf("could not find field %s in configuration", e.Field)
}

func getNestedMap(obj map[string]interface{}, fields ...string) (map[string]interface{}, error) {
	var res map[string]interface{}
	curr := obj

	for _, field := range fields {
		objField, ok := curr[field]

		if !ok {
			return nil, &NestedMapFieldNotFoundError{field}
		}

		res, ok = objField.(map[string]interface{})

		if !ok {
			return nil, fmt.Errorf("%s is not a nested object", field)
		}

		curr = res
	}

	return res, nil
}
