package porter_app

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"

	"github.com/stefanmcshane/helm/pkg/release"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	utils "github.com/porter-dev/porter/api/utils/porter_app"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type PorterAppHelmReleaseGetHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewPorterAppHelmReleaseGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *PorterAppHelmReleaseGetHandler {
	return &PorterAppHelmReleaseGetHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *PorterAppHelmReleaseGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	ctx, span := telemetry.NewSpan(ctx, "serve-get-porter-app-helm-release")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: project.ID},
		telemetry.AttributeKV{Key: "cluster-id", Value: cluster.ID},
	)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error getting stack name from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-name", Value: appName})

	version, reqErr := requestutils.GetURLParamUint(r, types.URLParamReleaseVersion)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error getting version from url")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "version", Value: version})

	// TODO (POR-2170): Deprecate this entire endpoint in favor of v2 endpoints
	if project.GetFeatureFlag(models.ValidateApplyV2, c.Config().LaunchDarklyClient) {
		appInstance, err := appInstanceFromAppName(ctx, appInstanceFromAppNameInput{
			ProjectID: project.ID,
			ClusterID: cluster.ID,
			AppName:   appName,
			CCPClient: c.Config().ClusterControlPlaneClient,
		})
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting deployment target id from app name")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		// TODO (POR-2170): delete these database calls once endpoint is deprecated
		var revision *models.AppRevision
		// treat version 0 as latest like helm
		if version == 0 {
			revision, err = c.Repo().AppRevision().LatestNumberedAppRevision(project.ID, appInstance.Id)
			if err != nil {
				err := telemetry.Error(ctx, span, err, "error getting latest numbered app revision")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
		} else {
			revision, err = c.Repo().AppRevision().AppRevisionByInstanceIDAndRevisionNumber(project.ID, appInstance.Id, version)
			if err != nil {
				err := telemetry.Error(ctx, span, err, "error getting app revision by instance id and revision number")
				c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
				return
			}
		}

		if revision == nil {
			err := telemetry.Error(ctx, span, err, "app revision is nil")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		appRevisionRequest := connect.NewRequest(&porterv1.GetAppRevisionRequest{
			ProjectId:     int64(project.ID),
			AppRevisionId: revision.ID.String(),
		})

		getAppRevisionResp, err := c.Config().ClusterControlPlaneClient.GetAppRevision(ctx, appRevisionRequest)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting current app revision from cluster control plane client")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		if getAppRevisionResp.Msg == nil || getAppRevisionResp.Msg.AppRevision == nil {
			err := telemetry.Error(ctx, span, err, "app revision is nil")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		appRevision := getAppRevisionResp.Msg.AppRevision

		if appRevision.App == nil || appRevision.App.Image == nil {
			err := telemetry.Error(ctx, span, err, "app revision app or image is nil")
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		res := &types.Release{
			Release: &release.Release{
				Name:  "",
				Info:  nil,
				Chart: nil,
				Config: map[string]interface{}{
					"global": map[string]interface{}{
						"image": map[string]interface{}{
							"tag": appRevision.App.Image.Tag,
						},
					},
				},
				Manifest:  "",
				Hooks:     nil,
				Version:   int(appRevision.RevisionNumber),
				Namespace: "",
				Labels:    nil,
			},
			PorterRelease: nil,
			Form:          nil,
		}

		c.WriteResult(w, r, res)
		return
	}

	namespace := utils.NamespaceFromPorterAppName(appName)
	helmAgent, err := c.GetHelmAgent(ctx, r, cluster, namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting helm agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	release, err := helmAgent.GetRelease(ctx, appName, int(version), false)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting helm release")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	res := &types.Release{
		Release: release,
	}

	c.WriteResult(w, r, res)
}

type appInstanceFromAppNameInput struct {
	ProjectID uint
	ClusterID uint
	AppName   string
	CCPClient porterv1connect.ClusterControlPlaneServiceClient
}

// appInstanceFromAppName makes a best-effort attempt to find the app instance for an app name
// It does this by getting all deployment targets in the cluster, then getting all app instances in the project,
// then filtering the app instances by app name and non-preview deployment targets. If there is only one matching
// app instance, then the instance is returned. Otherwise, an error is returned.
func appInstanceFromAppName(ctx context.Context, input appInstanceFromAppNameInput) (*porterv1.AppInstance, error) {
	ctx, span := telemetry.NewSpan(ctx, "app-instance-from-app-name")
	defer span.End()

	var appInstance *porterv1.AppInstance

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: input.ProjectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: input.ClusterID},
		telemetry.AttributeKV{Key: "app-name", Value: input.AppName},
	)

	listDeploymentTargetsReq := connect.NewRequest(&porterv1.DeploymentTargetsRequest{
		ProjectId: int64(input.ProjectID),
		ClusterId: int64(input.ClusterID),
	})
	listDeploymentTargetsResp, err := input.CCPClient.DeploymentTargets(ctx, listDeploymentTargetsReq)
	if err != nil {
		return appInstance, telemetry.Error(ctx, span, err, "error getting deployment targets from cluster control plane client")
	}

	if listDeploymentTargetsResp.Msg == nil || listDeploymentTargetsResp.Msg.DeploymentTargets == nil {
		return appInstance, telemetry.Error(ctx, span, nil, "deployment targets response is nil")
	}

	deploymentTargetSet := map[string]*porterv1.DeploymentTarget{}
	for _, deploymentTarget := range listDeploymentTargetsResp.Msg.DeploymentTargets {
		deploymentTargetSet[deploymentTarget.Id] = deploymentTarget
	}

	listAppInstancesReq := connect.NewRequest(&porterv1.ListAppInstancesRequest{
		ProjectId: int64(input.ProjectID),
	})
	listAppInstancesResp, err := input.CCPClient.ListAppInstances(ctx, listAppInstancesReq)
	if err != nil {
		return appInstance, telemetry.Error(ctx, span, err, "error getting app instances from cluster control plane client")
	}

	if listAppInstancesResp.Msg == nil || listAppInstancesResp.Msg.AppInstances == nil {
		return appInstance, telemetry.Error(ctx, span, nil, "app instances response is nil")
	}

	var matchingAppInstances []*porterv1.AppInstance

	for _, instance := range listAppInstancesResp.Msg.AppInstances {
		if instance == nil {
			continue
		}
		if instance.Name == input.AppName {
			if deploymentTargetSet[instance.DeploymentTargetId] == nil {
				continue
			}
			if deploymentTargetSet[instance.DeploymentTargetId].IsPreview {
				continue
			}
			matchingAppInstances = append(matchingAppInstances, instance)
		}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "len-app-instances", Value: len(matchingAppInstances)})

	printInstances := func([]*porterv1.AppInstance) string {
		var stringInstances []string
		for _, appInstance := range matchingAppInstances {
			stringInstances = append(stringInstances, appInstance.String())
		}
		return fmt.Sprintf("[%s]", strings.Join(stringInstances, ","))
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-instances", Value: printInstances(matchingAppInstances)})

	if len(matchingAppInstances) == 0 {
		return appInstance, telemetry.Error(ctx, span, nil, "no matching app instances found")
	}

	if len(matchingAppInstances) > 1 {
		return appInstance, telemetry.Error(ctx, span, nil, "multiple matching app instances found")
	}

	matchingDeploymentTarget := deploymentTargetSet[matchingAppInstances[0].DeploymentTargetId]
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "matching-deployment-target", Value: matchingDeploymentTarget.String()})

	return matchingAppInstances[0], nil
}
