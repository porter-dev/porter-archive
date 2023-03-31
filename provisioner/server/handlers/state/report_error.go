package state

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/redis_stream"
	"github.com/porter-dev/porter/provisioner/server/config"
	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type ReportErrorHandler struct {
	Config           *config.Config
	decoderValidator shared.RequestDecoderValidator
}

func NewReportErrorHandler(
	config *config.Config,
) *ReportErrorHandler {
	return &ReportErrorHandler{
		Config:           config,
		decoderValidator: shared.NewDefaultRequestDecoderValidator(config.Logger, config.Alerter),
	}
}

func (c *ReportErrorHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)

	req := &ptypes.ReportErrorRequest{}

	if ok := c.decoderValidator.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// update the infra to indicate error
	infra.Status = "errored"

	infra, err := c.Config.Repo.Infra().UpdateInfra(infra)
	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// update the operation with the error
	operation.Status = "errored"
	operation.Errored = true
	operation.Error = req.Error

	operation, err = c.Config.Repo.Infra().UpdateOperation(operation)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// push to the operation stream
	err = redis_stream.SendOperationCompleted(c.Config.RedisClient, infra, operation)

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// push to the global stream
	err = redis_stream.PushToGlobalStream(c.Config.RedisClient, infra, operation, "error")

	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	// report the error to the error alerter but don't send to client
	apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(
		fmt.Errorf(req.Error),
	), false)

	switch infra.Kind {
	case types.InfraEKS, types.InfraDOKS, types.InfraGKE:
		var cluster *models.Cluster

		if cluster != nil {
			c.Config.AnalyticsClient.Track(analytics.ClusterProvisioningErrorTrack(
				&analytics.ClusterProvisioningErrorTrackOpts{
					ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(0, infra.ProjectID),
					ClusterType:            infra.Kind,
					InfraID:                infra.ID,
				},
			))
		}
	}
}
