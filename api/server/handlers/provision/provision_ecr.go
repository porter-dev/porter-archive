package provision

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type ProvisionECRHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProvisionECRHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProvisionECRHandler {
	return &ProvisionECRHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ProvisionECRHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project from context
	// proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// request := &types.CreateClusterManualRequest{}

	// if ok := c.DecodeAndValidate(w, r, request); !ok {
	// 	return
	// }

	// cluster, err := getClusterModelFromManualRequest(c.Repo(), proj, request)

	// if err != nil {
	// 	c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	// 	return
	// }

	// cluster, err = c.Repo().Cluster().CreateCluster(cluster)

	// if err != nil {
	// 	c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	// 	return
	// }

	// c.WriteResult(w, r, cluster.ToClusterType())
}

// HandleProvisionAWSECRInfra provisions a new aws ECR instance for a project
// func (app *App) HandleProvisionAWSECRInfra(w http.ResponseWriter, r *http.Request) {
// 	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

// 	if err != nil || projID == 0 {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	form := &forms.CreateECRInfra{
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
// 	_, err = app.ProvisionerAgent.ProvisionECR(
// 		uint(projID),
// 		awsInt,
// 		form.ECRName,
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

// 	app.Logger.Info().Msgf("New aws ecr infra created: %d", infra.ID)

// 	w.WriteHeader(http.StatusCreated)

// 	infraExt := infra.ToInfraType()

// 	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}
// }
