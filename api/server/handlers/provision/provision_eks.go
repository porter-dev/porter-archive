package provision

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type ProvisionEKSHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProvisionEKSHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProvisionEKSHandler {
	return &ProvisionEKSHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ProvisionEKSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project from context
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateEKSInfraRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// get the AWS integration
	awsInt, err := c.Repo().AWSIntegration().ReadAWSIntegration(proj.ID, request.AWSIntegrationID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		} else {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	suffix, err := repository.GenerateRandomBytes(6)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	infra := &models.Infra{
		Kind:             types.InfraEKS,
		ProjectID:        proj.ID,
		Suffix:           suffix,
		Status:           types.StatusCreating,
		AWSIntegrationID: request.AWSIntegrationID,
	}

	// handle write to the database
	infra, err = c.Repo().Infra().CreateInfra(infra)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// launch provisioning pod
	_, err = c.Config().ProvisionerAgent.ProvisionEKS(
		&kubernetes.SharedProvisionOpts{
			ProjectID:           proj.ID,
			Repo:                c.Repo(),
			Infra:               infra,
			Operation:           provisioner.Apply,
			PGConf:              c.Config().DBConf,
			RedisConf:           c.Config().RedisConf,
			ProvImageTag:        c.Config().ServerConf.ProvisionerImageTag,
			ProvImagePullSecret: c.Config().ServerConf.ProvisionerImagePullSecret,
		},
		awsInt,
		request.EKSName,
		request.MachineType,
	)

	if err != nil {
		infra.Status = types.StatusError
		infra, _ = c.Repo().Infra().UpdateInfra(infra)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, infra.ToInfraType())
}

// // HandleProvisionAWSEKSInfra provisions a new aws EKS instance for a project
// func (app *App) HandleProvisionAWSEKSInfra(w http.ResponseWriter, r *http.Request) {
// 	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)
// 	userID, err := app.getUserIDFromRequest(r)

// 	if err != nil || projID == 0 {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	form := &forms.CreateEKSInfra{
// 		ProjectID: uint(projID),
// 	}

// 	// decode from JSON to form value
// 	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	// validate the form
// 	if err := app.validator.Struct(form); err != nil {
// 		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
// 		return
// 	}

// 	// convert the form to an aws infra instance
// 	infra, err := form.ToInfra()

// 	if err != nil {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	// handle write to the database
// 	infra, err = app.Repo.Infra().CreateInfra(infra)

// 	if err != nil {
// 		app.handleErrorDataWrite(err, w)
// 		return
// 	}

// 	awsInt, err := app.Repo.AWSIntegration().ReadAWSIntegration(infra.AWSIntegrationID)

// 	if err != nil {
// 		infra.Status = types.StatusError
// 		infra, _ = app.Repo.Infra().UpdateInfra(infra)

// 		app.handleErrorDataRead(err, w)
// 		return
// 	}

// 	// launch provisioning pod
// 	_, err = app.ProvisionerAgent.ProvisionEKS(
// 		uint(projID),
// 		awsInt,
// 		form.EKSName,
// 		form.MachineType,
// 		app.Repo,
// 		infra,
// 		provisioner.Apply,
// 		&app.DBConf,
// 		app.RedisConf,
// 		app.ServerConf.ProvisionerImageTag,
// 		app.ServerConf.ProvisionerImagePullSecret,
// 	)

// 	if err != nil {
// 		infra.Status = types.StatusError
// 		infra, _ = app.Repo.Infra().UpdateInfra(infra)

// 		app.handleErrorInternal(err, w)
// 		return
// 	}

// 	app.Logger.Info().Msgf("New aws eks infra created: %d", infra.ID)
// 	app.analyticsClient.Track(analytics.CreateSegmentNewClusterEvent(
// 		&analytics.NewClusterEventOpts{
// 			UserId:      fmt.Sprintf("%d", userID),
// 			ProjId:      fmt.Sprintf("%d", infra.ProjectID),
// 			ClusterName: form.EKSName,
// 			ClusterType: "EKS",
// 			EventType:   "provisioned",
// 		},
// 	))

// 	w.WriteHeader(http.StatusCreated)

// 	infraExt := infra.ToInfraType()

// 	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}
// }
