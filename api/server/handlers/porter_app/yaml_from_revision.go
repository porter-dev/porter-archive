package porter_app

import (
	"context"
	"encoding/base64"
	"net/http"
	"sort"
	"strings"

	"github.com/porter-dev/porter/internal/kubernetes"

	"github.com/google/uuid"
	"github.com/porter-dev/api-contracts/generated/go/helpers"
	"github.com/porter-dev/api-contracts/generated/go/porter/v1/porterv1connect"
	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/repository"

	"github.com/porter-dev/porter/internal/porter_app"

	"connectrpc.com/connect"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"gopkg.in/yaml.v2"

	v2 "github.com/porter-dev/porter/internal/porter_app/v2"
	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// PorterYAMLFromRevisionHandler is the handler for the /apps/{porter_app_name}/revisions/{app_revision_id}/yaml endpoint
type PorterYAMLFromRevisionHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewPorterYAMLFromRevisionHandler returns a new PorterYAMLFromRevisionHandler
func NewPorterYAMLFromRevisionHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *PorterYAMLFromRevisionHandler {
	return &PorterYAMLFromRevisionHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// PorterYAMLFromRevisionRequest is the request object for the /apps/{porter_app_name}/revisions/{app_revision_id}/yaml endpoint
type PorterYAMLFromRevisionRequest struct {
	ShouldFormatForExport bool `schema:"should_format_for_export"`
}

// PorterYAMLFromRevisionResponse is the response object for the /apps/{porter_app_name}/revisions/{app_revision_id}/yaml endpoint
type PorterYAMLFromRevisionResponse struct {
	B64PorterYAML string `json:"b64_porter_yaml"`
}

// ServeHTTP takes a porter app revision and returns the porter yaml for it
func (c *PorterYAMLFromRevisionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-porter-yaml-from-revision")
	defer span.End()

	r = r.Clone(ctx)

	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	appRevisionID, reqErr := requestutils.GetURLParamString(r, types.URLParamAppRevisionID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing app revision id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	request := &PorterYAMLFromRevisionRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	getRevisionReq := connect.NewRequest(&porterv1.GetAppRevisionRequest{
		ProjectId:     int64(project.ID),
		AppRevisionId: appRevisionID,
	})
	ccpResp, err := c.Config().ClusterControlPlaneClient.GetAppRevision(ctx, getRevisionReq)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting app revision")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp == nil || ccpResp.Msg == nil {
		err = telemetry.Error(ctx, span, nil, "get app revision response is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if ccpResp.Msg.AppRevision == nil {
		err = telemetry.Error(ctx, span, nil, "app revision is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appProto := ccpResp.Msg.AppRevision.App
	if appProto == nil {
		err = telemetry.Error(ctx, span, nil, "app proto is nil")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	agent, err := c.GetAgent(r, cluster, "")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting agent for cluster")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	appRevisionUUID, err := uuid.Parse(appRevisionID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error parsing app revision id")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	env, defaultEnvGroupName, err := defaultEnvGroup(ctx, formatDefaultEnvGroupInput{
		ProjectID:                 project.ID,
		Cluster:                   cluster,
		AppRevisionID:             appRevisionUUID,
		appYAML:                   v2.PorterApp{},
		K8sAgent:                  agent,
		ClusterControlPlaneClient: c.Config().ClusterControlPlaneClient,
		PorterAppRepository:       c.Repo().PorterApp(),
	})
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error formatting default env group")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	app, err := v2.AppFromProto(appProto)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error converting app proto to porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var envGroups []string
	for _, envGroup := range app.EnvGroups {
		if !strings.Contains(envGroup, defaultEnvGroupName) {
			envGroups = append(envGroups, envGroup)
		}
	}

	app.Env = env
	app.EnvGroups = envGroups

	app = zeroOutValues(app)

	if request.ShouldFormatForExport {
		app = formatForExport(app, c.Config().ServerConf.AppRootDomain)
	}

	// sort services by name
	sortedServices := app.Services
	sort.Slice(sortedServices, func(i, j int) bool {
		serviceTypeSortPriorityA, ok := serviceTypeSortPriority[sortedServices[i].Type]
		if !ok {
			return false
		}
		serviceTypeSortPriorityB, ok := serviceTypeSortPriority[sortedServices[j].Type]
		if !ok {
			return false
		}
		if serviceTypeSortPriorityA != serviceTypeSortPriorityB {
			return serviceTypeSortPriorityA < serviceTypeSortPriorityB
		}
		return sortedServices[i].Name < sortedServices[j].Name
	})
	app.Services = sortedServices

	servicesWithDomainsSorted := app.Services
	for i := range servicesWithDomainsSorted {
		sortedDomains := servicesWithDomainsSorted[i].Domains
		sort.Slice(sortedDomains, func(i, j int) bool {
			return sortedDomains[i].Name < sortedDomains[j].Name
		})
		servicesWithDomainsSorted[i].Domains = sortedDomains
	}
	app.Services = servicesWithDomainsSorted

	// sort env variables by key
	sortedEnv := app.Env
	sort.Slice(sortedEnv, func(i, j int) bool {
		return sortedEnv[i].Key < sortedEnv[j].Key
	})
	app.Env = sortedEnv

	porterYAMLString, err := yaml.Marshal(app)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error marshaling porter yaml")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	b64String := base64.StdEncoding.EncodeToString(porterYAMLString)

	response := &PorterYAMLFromRevisionResponse{
		B64PorterYAML: b64String,
	}

	c.WriteResult(w, r, response)
}

type formatDefaultEnvGroupInput struct {
	ProjectID     uint
	Cluster       *models.Cluster
	AppRevisionID uuid.UUID
	appYAML       v2.PorterApp

	K8sAgent                  *kubernetes.Agent
	ClusterControlPlaneClient porterv1connect.ClusterControlPlaneServiceClient
	PorterAppRepository       repository.PorterAppRepository
}

func defaultEnvGroup(ctx context.Context, input formatDefaultEnvGroupInput) ([]v2.EnvVariableDefinition, string, error) {
	ctx, span := telemetry.NewSpan(ctx, "format-default-env-group")
	defer span.End()

	var env []v2.EnvVariableDefinition

	revision, err := porter_app.GetAppRevision(ctx, porter_app.GetAppRevisionInput{
		AppRevisionID: input.AppRevisionID,
		ProjectID:     input.ProjectID,
		CCPClient:     input.ClusterControlPlaneClient,
	})
	if err != nil {
		return env, "", telemetry.Error(ctx, span, err, "error getting app revision")
	}

	decoded, err := base64.StdEncoding.DecodeString(revision.B64AppProto)
	if err != nil {
		return env, "", telemetry.Error(ctx, span, err, "error decoding base proto")
	}

	appProto := &porterv1.PorterApp{}
	err = helpers.UnmarshalContractObject(decoded, appProto)
	if err != nil {
		return env, "", telemetry.Error(ctx, span, err, "error unmarshalling app proto")
	}

	deploymentTarget, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
		ProjectID:          int64(input.ProjectID),
		ClusterID:          int64(input.Cluster.ID),
		DeploymentTargetID: revision.DeploymentTarget.ID,
		CCPClient:          input.ClusterControlPlaneClient,
	})
	if err != nil {
		return env, "", telemetry.Error(ctx, span, err, "error getting deployment target details")
	}

	revisionWithEnv, err := porter_app.AttachEnvToRevision(ctx, porter_app.AttachEnvToRevisionInput{
		ProjectID:           input.ProjectID,
		ClusterID:           int(input.Cluster.ID),
		Revision:            revision,
		DeploymentTarget:    deploymentTarget,
		K8SAgent:            input.K8sAgent,
		PorterAppRepository: input.PorterAppRepository,
	})
	if err != nil {
		return env, "", telemetry.Error(ctx, span, err, "error attaching env to revision")
	}

	for key, val := range revisionWithEnv.Env.Variables {
		env = append(env, v2.EnvVariableDefinition{
			Key:    key,
			Source: v2.EnvVariableSource_Value,
			Value: v2.EnvValueOptional{
				Value: val,
				IsSet: true,
			},
		})
	}
	for key, val := range revisionWithEnv.Env.SecretVariables {
		env = append(env, v2.EnvVariableDefinition{
			Key:    key,
			Source: v2.EnvVariableSource_Value,
			Value: v2.EnvValueOptional{
				Value: val,
				IsSet: true,
			},
		})
	}

	for _, ev := range appProto.Env {
		if ev.Source == porterv1.EnvVariableSource_ENV_VARIABLE_SOURCE_FROM_APP {
			fromAppProto := ev.GetFromApp()
			if fromAppProto == nil {
				continue
			}

			fromApp, err := v2.EnvVarFromAppFromProto(fromAppProto)
			if err != nil {
				return env, "", telemetry.Error(ctx, span, err, "error converting env var from app to proto")
			}

			envVar := v2.EnvVariableDefinition{
				Key:     ev.Key,
				Source:  v2.EnvVariableSource_FromApp,
				FromApp: fromApp,
			}

			env = append(env, envVar)
		}
	}

	return env, revisionWithEnv.Env.Name, nil
}

func formatForExport(app v2.PorterApp, appRootDomain string) v2.PorterApp {
	for i := range app.Services {
		app.Services[i] = filterNewServiceValues(app.Services[i])

		if app.Services[i].Type == v2.ServiceType_Web {
			// remove porter domains
			var filteredDomains []v2.Domains
			for _, domain := range app.Services[i].Domains {
				if !strings.HasSuffix(domain.Name, appRootDomain) {
					filteredDomains = append(filteredDomains, domain)
				}
			}
			app.Services[i].Domains = filteredDomains
		}
	}

	if app.Predeploy != nil {
		predeploy := filterNewServiceValues(*app.Predeploy)
		app.Predeploy = &predeploy
	}

	// don't show image or commit sha if build is present
	if app.Build != nil {
		app.Image = nil
		app.Build.CommitSHA = ""
	}

	// remove env secrets from env
	var filtered []v2.EnvVariableDefinition
	for _, ev := range app.Env {
		if ev.Value.Value != "********" {
			filtered = append(filtered, ev)
		}
	}
	app.Env = filtered

	// don't show env group versions
	for i := range app.EnvGroups {
		app.EnvGroups[i] = strings.Split(app.EnvGroups[i], ":")[0]
	}

	return app
}

// this "no-op" ensures that new fields are always zero-ed out in the exported yaml, until we specifically add it here
func filterNewServiceValues(service v2.Service) v2.Service {
	return v2.Service{
		Name:                          service.Name,
		Run:                           service.Run,
		Type:                          service.Type,
		Instances:                     service.Instances,
		CpuCores:                      service.CpuCores,
		RamMegabytes:                  service.RamMegabytes,
		GpuCoresNvidia:                service.GpuCoresNvidia,
		GPU:                           service.GPU,
		SmartOptimization:             service.SmartOptimization,
		TerminationGracePeriodSeconds: service.TerminationGracePeriodSeconds,
		Port:                          service.Port,
		Autoscaling:                   service.Autoscaling,
		Domains:                       service.Domains,
		HealthCheck:                   service.HealthCheck,
		AllowConcurrent:               service.AllowConcurrent,
		Cron:                          service.Cron,
		SuspendCron:                   service.SuspendCron,
		TimeoutSeconds:                service.TimeoutSeconds,
		Private:                       service.Private,
		IngressAnnotations:            service.IngressAnnotations,
		DisableTLS:                    service.DisableTLS,
		Sleep:                         service.Sleep,
	}
}

func zeroOutValues(app v2.PorterApp) v2.PorterApp {
	for i := range app.Services {
		// remove smart optimization
		app.Services[i].SmartOptimization = nil

		if app.Services[i].GPU != nil && !app.Services[i].GPU.Enabled {
			app.Services[i].GPU = nil
		}

		// remove launcher
		if app.Services[i].Run != nil {
			launcherLess := strings.TrimPrefix(*app.Services[i].Run, "launcher ")
			launcherLess = strings.TrimPrefix(launcherLess, "/cnb/lifecycle/launcher ")
			app.Services[i].Run = &launcherLess
		}

		switch app.Services[i].Type {
		case v2.ServiceType_Web:
			// remove autoscaling if not enabled
			if app.Services[i].Autoscaling != nil && !app.Services[i].Autoscaling.Enabled {
				app.Services[i].Autoscaling = nil
			}
			// remove health if not enabled
			if app.Services[i].HealthCheck != nil && !app.Services[i].HealthCheck.Enabled {
				app.Services[i].HealthCheck = nil
			}
			// don't show disableTLS if not enabled
			if app.Services[i].DisableTLS != nil && !*app.Services[i].DisableTLS {
				app.Services[i].DisableTLS = nil
			}
			// remove private if not enabled
			if app.Services[i].Private != nil && !*app.Services[i].Private {
				app.Services[i].Private = nil
			}
		case v2.ServiceType_Worker:
			// remove autoscaling if not enabled
			if app.Services[i].Autoscaling != nil && !app.Services[i].Autoscaling.Enabled {
				app.Services[i].Autoscaling = nil
			}
			// remove health if not enabled
			if app.Services[i].HealthCheck != nil && !app.Services[i].HealthCheck.Enabled {
				app.Services[i].HealthCheck = nil
			}
			// remove port
			app.Services[i].Port = 0
		case v2.ServiceType_Job:
			// remove port
			app.Services[i].Port = 0
			// remove instances
			app.Services[i].Instances = nil
			// remove suspendCron if not enabled
			if app.Services[i].SuspendCron != nil && !*app.Services[i].SuspendCron {
				app.Services[i].SuspendCron = nil
			}
			// remove allowConcurrency if not enabled
			if app.Services[i].AllowConcurrent != nil && !*app.Services[i].AllowConcurrent {
				app.Services[i].AllowConcurrent = nil
			}
		}
	}

	if app.Predeploy != nil {
		// remove name
		app.Predeploy.Name = ""
		// remove type
		app.Predeploy.Type = ""
		// remove smart optimization
		app.Predeploy.SmartOptimization = nil
		// remove launcher
		if app.Predeploy.Run != nil {
			launcherLess := strings.TrimPrefix(*app.Predeploy.Run, "launcher ")
			launcherLess = strings.TrimPrefix(launcherLess, "/cnb/lifecycle/launcher ")
			app.Predeploy.Run = &launcherLess
		}
		// remove port
		app.Predeploy.Port = 0
		// remove instances
		app.Predeploy.Instances = nil
		// remove suspendCron
		app.Predeploy.SuspendCron = nil
		// remove allowConcurrency
		app.Predeploy.AllowConcurrent = nil
		// remove timeout
		app.Predeploy.TimeoutSeconds = 0
		// remove gpu
		app.Predeploy.GPU = nil
	}

	if app.InitialDeploy != nil {
		// remove name
		app.InitialDeploy.Name = ""
		// remove type
		app.InitialDeploy.Type = ""
		// remove smart optimization
		app.InitialDeploy.SmartOptimization = nil
		// remove launcher
		if app.InitialDeploy.Run != nil {
			launcherLess := strings.TrimPrefix(*app.InitialDeploy.Run, "launcher ")
			launcherLess = strings.TrimPrefix(launcherLess, "/cnb/lifecycle/launcher ")
			app.InitialDeploy.Run = &launcherLess
		}
		// remove port
		app.InitialDeploy.Port = 0
		// remove instances
		app.InitialDeploy.Instances = nil
		// remove suspendCron
		app.InitialDeploy.SuspendCron = nil
		// remove allowConcurrency
		app.InitialDeploy.AllowConcurrent = nil
		// remove timeout
		app.InitialDeploy.TimeoutSeconds = 0
		// remove gpu
		app.InitialDeploy.GPU = nil
	}

	return app
}

var serviceTypeSortPriority = map[v2.ServiceType]int{
	v2.ServiceType_Web:    0,
	v2.ServiceType_Worker: 1,
	v2.ServiceType_Job:    2,
}
