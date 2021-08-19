package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"

	"fmt"

	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/kubernetes/provisioner"
	"github.com/porter-dev/porter/internal/models"

	"github.com/porter-dev/porter/internal/adapter"
)

// HandleProvisionTestInfra will create a test resource by deploying a provisioner
// container pod
func (app *App) HandleProvisionTestInfra(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateTestInfra{
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// convert the form to an aws infra instance
	infra, err := form.ToInfra()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	infra, err = app.Repo.Infra().CreateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	_, err = app.ProvisionerAgent.ProvisionTest(
		uint(projID),
		infra,
		app.Repo,
		provisioner.Apply,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("New test infra created: %d", infra.ID)

	w.WriteHeader(http.StatusCreated)

	infraExt := infra.Externalize()

	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDestroyTestInfra destroys test infra
func (app *App) HandleDestroyTestInfra(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	infraID, err := strconv.ParseUint(chi.URLParam(r, "infra_id"), 10, 64)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// read infra to get id
	infra, err := app.Repo.Infra().ReadInfra(uint(infraID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// launch provisioning destruction pod
	agent, err := kubernetes.GetAgentInClusterConfig()

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorDataRead(err, w)
		return
	}

	// mark infra for deletion
	infra.Status = models.StatusDestroying
	infra, err = app.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	_, err = agent.ProvisionTest(
		infra.ProjectID,
		infra,
		app.Repo,
		provisioner.Destroy,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("Test infra marked for destruction: %d", infra.ID)

	w.WriteHeader(http.StatusOK)
}

// HandleProvisionAWSECRInfra provisions a new aws ECR instance for a project
func (app *App) HandleProvisionAWSECRInfra(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateECRInfra{
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to an aws infra instance
	infra, err := form.ToInfra()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	infra, err = app.Repo.Infra().CreateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	awsInt, err := app.Repo.AWSIntegration().ReadAWSIntegration(infra.AWSIntegrationID)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorDataRead(err, w)
		return
	}

	// launch provisioning pod
	_, err = app.ProvisionerAgent.ProvisionECR(
		uint(projID),
		awsInt,
		form.ECRName,
		app.Repo,
		infra,
		provisioner.Apply,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("New aws ecr infra created: %d", infra.ID)

	w.WriteHeader(http.StatusCreated)

	infraExt := infra.Externalize()

	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDestroyAWSECRInfra destroys ecr infra
func (app *App) HandleDestroyAWSECRInfra(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	infraID, err := strconv.ParseUint(chi.URLParam(r, "infra_id"), 10, 64)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// read infra to get id
	infra, err := app.Repo.Infra().ReadInfra(uint(infraID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	awsInt, err := app.Repo.AWSIntegration().ReadAWSIntegration(infra.AWSIntegrationID)

	form := &forms.DestroyECRInfra{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// launch provisioning destruction pod
	// mark infra for deletion
	infra.Status = models.StatusDestroying
	infra, err = app.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	_, err = app.ProvisionerAgent.ProvisionECR(
		infra.ProjectID,
		awsInt,
		form.ECRName,
		app.Repo,
		infra,
		provisioner.Destroy,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("AWS ECR infra marked for destruction: %d", infra.ID)

	w.WriteHeader(http.StatusOK)
}

// HandleProvisionAWSEKSInfra provisions a new aws EKS instance for a project
func (app *App) HandleProvisionAWSEKSInfra(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)
	userID, err := app.getUserIDFromRequest(r)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateEKSInfra{
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to an aws infra instance
	infra, err := form.ToInfra()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	infra, err = app.Repo.Infra().CreateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	awsInt, err := app.Repo.AWSIntegration().ReadAWSIntegration(infra.AWSIntegrationID)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorDataRead(err, w)
		return
	}

	// launch provisioning pod
	_, err = app.ProvisionerAgent.ProvisionEKS(
		uint(projID),
		awsInt,
		form.EKSName,
		form.MachineType,
		app.Repo,
		infra,
		provisioner.Apply,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("New aws eks infra created: %d", infra.ID)
	app.analyticsClient.Track(analytics.CreateSegmentNewClusterEvent(
		&analytics.NewClusterEventOpts{
			UserId:      fmt.Sprintf("%d", userID),
			ProjId:      fmt.Sprintf("%d", infra.ProjectID),
			ClusterName: form.EKSName,
			ClusterType: "EKS",
			EventType:   "provisioned",
		},
	))

	w.WriteHeader(http.StatusCreated)

	infraExt := infra.Externalize()

	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDestroyAWSEKSInfra destroys eks infra
func (app *App) HandleDestroyAWSEKSInfra(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	infraID, err := strconv.ParseUint(chi.URLParam(r, "infra_id"), 10, 64)
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// read infra to get id
	infra, err := app.Repo.Infra().ReadInfra(uint(infraID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	awsInt, err := app.Repo.AWSIntegration().ReadAWSIntegration(infra.AWSIntegrationID)

	form := &forms.DestroyEKSInfra{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// launch provisioning destruction pod
	// mark infra for deletion
	infra.Status = models.StatusDestroying
	infra, err = app.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	_, err = app.ProvisionerAgent.ProvisionEKS(
		infra.ProjectID,
		awsInt,
		form.EKSName,
		"",
		app.Repo,
		infra,
		provisioner.Destroy,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("AWS EKS infra marked for destruction: %d", infra.ID)
	app.analyticsClient.Track(analytics.CreateSegmentNewClusterEvent(
		&analytics.NewClusterEventOpts{
			UserId:      fmt.Sprintf("%d", userID),
			ProjId:      fmt.Sprintf("%d", infra.ProjectID),
			ClusterName: form.EKSName,
			ClusterType: "EKS",
			EventType:   "destroyed",
		},
	))

	w.WriteHeader(http.StatusOK)
}

// HandleProvisionGCPGCRInfra enables GCR for a project
func (app *App) HandleProvisionGCPGCRInfra(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateGCRInfra{
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to an aws infra instance
	infra, err := form.ToInfra()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	infra, err = app.Repo.Infra().CreateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	gcpInt, err := app.Repo.GCPIntegration().ReadGCPIntegration(infra.GCPIntegrationID)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorDataRead(err, w)
		return
	}

	// launch provisioning pod
	_, err = app.ProvisionerAgent.ProvisionGCR(
		uint(projID),
		gcpInt,
		app.Repo,
		infra,
		provisioner.Apply,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("New gcp gcr infra created: %d", infra.ID)

	w.WriteHeader(http.StatusCreated)

	infraExt := infra.Externalize()

	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleProvisionGCPGKEInfra provisions a new GKE instance for a project
func (app *App) HandleProvisionGCPGKEInfra(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)
	userID, err := app.getUserIDFromRequest(r)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateGKEInfra{
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to an aws infra instance
	infra, err := form.ToInfra()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	infra, err = app.Repo.Infra().CreateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	gcpInt, err := app.Repo.GCPIntegration().ReadGCPIntegration(infra.GCPIntegrationID)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorDataRead(err, w)
		return
	}

	// launch provisioning pod
	_, err = app.ProvisionerAgent.ProvisionGKE(
		uint(projID),
		gcpInt,
		form.GKEName,
		app.Repo,
		infra,
		provisioner.Apply,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("New gcp gke infra created: %d", infra.ID)
	app.analyticsClient.Track(analytics.CreateSegmentNewClusterEvent(
		&analytics.NewClusterEventOpts{
			UserId:      fmt.Sprintf("%d", userID),
			ProjId:      fmt.Sprintf("%d", infra.ProjectID),
			ClusterName: form.GKEName,
			ClusterType: "GKE",
			EventType:   "provisioned",
		},
	))

	w.WriteHeader(http.StatusCreated)

	infraExt := infra.Externalize()

	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDestroyGCPGKEInfra destroys gke infra
func (app *App) HandleDestroyGCPGKEInfra(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	infraID, err := strconv.ParseUint(chi.URLParam(r, "infra_id"), 10, 64)
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// read infra to get id
	infra, err := app.Repo.Infra().ReadInfra(uint(infraID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	gcpInt, err := app.Repo.GCPIntegration().ReadGCPIntegration(infra.GCPIntegrationID)

	form := &forms.DestroyGKEInfra{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// launch provisioning destruction pod
	// mark infra for deletion
	infra.Status = models.StatusDestroying
	infra, err = app.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	_, err = app.ProvisionerAgent.ProvisionGKE(
		infra.ProjectID,
		gcpInt,
		form.GKEName,
		app.Repo,
		infra,
		provisioner.Destroy,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("GCP GKE infra marked for destruction: %d", infra.ID)
	app.analyticsClient.Track(analytics.CreateSegmentNewClusterEvent(
		&analytics.NewClusterEventOpts{
			UserId:      fmt.Sprintf("%d", userID),
			ProjId:      fmt.Sprintf("%d", infra.ProjectID),
			ClusterName: form.GKEName,
			ClusterType: "GKE",
			EventType:   "destroyed",
		},
	))

	w.WriteHeader(http.StatusOK)
}

// HandleGetProvisioningLogs returns real-time logs of the provisioning process via websockets
func (app *App) HandleGetProvisioningLogs(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	infraID, err := strconv.ParseUint(chi.URLParam(r, "infra_id"), 10, 64)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// read infra to get id
	infra, err := app.Repo.Infra().ReadInfra(uint(infraID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	streamName := infra.GetUniqueName()

	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	// upgrade to websocket.
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		app.handleErrorUpgradeWebsocket(err, w)
	}

	client, err := adapter.NewRedisClient(app.RedisConf)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	err = provisioner.ResourceStream(client, streamName, conn)

	if err != nil {
		app.handleErrorWebsocketWrite(err, w)
		return
	}
}

// HandleProvisionDODOCRInfra provisions a new digitalocean DOCR instance for a project
func (app *App) HandleProvisionDODOCRInfra(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateDOCRInfra{
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to an aws infra instance
	infra, err := form.ToInfra()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	infra, err = app.Repo.Infra().CreateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	oauthInt, err := app.Repo.OAuthIntegration().ReadOAuthIntegration(infra.DOIntegrationID)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorDataRead(err, w)
		return
	}

	// launch provisioning pod
	_, err = app.ProvisionerAgent.ProvisionDOCR(
		uint(projID),
		oauthInt,
		app.DOConf,
		app.Repo,
		form.DOCRName,
		form.DOCRSubscriptionTier,
		infra,
		provisioner.Apply,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("New do docr infra created: %d", infra.ID)

	w.WriteHeader(http.StatusCreated)

	infraExt := infra.Externalize()

	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDestroyAWSDOCRInfra destroys docr infra
func (app *App) HandleDestroyDODOCRInfra(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	infraID, err := strconv.ParseUint(chi.URLParam(r, "infra_id"), 10, 64)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// read infra to get id
	infra, err := app.Repo.Infra().ReadInfra(uint(infraID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	oauthInt, err := app.Repo.OAuthIntegration().ReadOAuthIntegration(infra.DOIntegrationID)

	form := &forms.DestroyDOCRInfra{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// launch provisioning destruction pod
	// mark infra for deletion
	infra.Status = models.StatusDestroying
	infra, err = app.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	_, err = app.ProvisionerAgent.ProvisionDOCR(
		infra.ProjectID,
		oauthInt,
		app.DOConf,
		app.Repo,
		form.DOCRName,
		"basic", // this doesn't matter for destroy
		infra,
		provisioner.Destroy,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("DO DOCR infra marked for destruction: %d", infra.ID)

	w.WriteHeader(http.StatusOK)
}

// HandleProvisionDODOKSInfra provisions a new DO DOKS instance for a project
func (app *App) HandleProvisionDODOKSInfra(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)
	userID, err := app.getUserIDFromRequest(r)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateDOKSInfra{
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to an aws infra instance
	infra, err := form.ToInfra()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	infra, err = app.Repo.Infra().CreateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	oauthInt, err := app.Repo.OAuthIntegration().ReadOAuthIntegration(infra.DOIntegrationID)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorDataRead(err, w)
		return
	}

	// launch provisioning pod
	_, err = app.ProvisionerAgent.ProvisionDOKS(
		uint(projID),
		oauthInt,
		app.DOConf,
		app.Repo,
		form.DORegion,
		form.DOKSName,
		infra,
		provisioner.Apply,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("New do doks infra created: %d", infra.ID)
	app.analyticsClient.Track(analytics.CreateSegmentNewClusterEvent(
		&analytics.NewClusterEventOpts{
			UserId:      fmt.Sprintf("%d", userID),
			ProjId:      fmt.Sprintf("%d", infra.ProjectID),
			ClusterName: form.DOKSName,
			ClusterType: "DOKS",
			EventType:   "provisioned",
		},
	))

	w.WriteHeader(http.StatusCreated)

	infraExt := infra.Externalize()

	if err := json.NewEncoder(w).Encode(infraExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDestroyDODOKSInfra destroys DOKS infra
func (app *App) HandleDestroyDODOKSInfra(w http.ResponseWriter, r *http.Request) {
	// get path parameters
	infraID, err := strconv.ParseUint(chi.URLParam(r, "infra_id"), 10, 64)
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// read infra to get id
	infra, err := app.Repo.Infra().ReadInfra(uint(infraID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	oauthInt, err := app.Repo.OAuthIntegration().ReadOAuthIntegration(infra.DOIntegrationID)

	form := &forms.DestroyDOKSInfra{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		infra.Status = models.StatusError
		infra, _ = app.Repo.Infra().UpdateInfra(infra)

		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// launch provisioning destruction pod
	// mark infra for deletion
	infra.Status = models.StatusDestroying
	infra, err = app.Repo.Infra().UpdateInfra(infra)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	_, err = app.ProvisionerAgent.ProvisionDOKS(
		infra.ProjectID,
		oauthInt,
		app.DOConf,
		app.Repo,
		"nyc1",
		form.DOKSName,
		infra,
		provisioner.Destroy,
		&app.DBConf,
		app.RedisConf,
		app.ServerConf.ProvisionerImageTag,
		app.ServerConf.ProvisionerImagePullSecret,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	app.Logger.Info().Msgf("DO DOKS infra marked for destruction: %d", infra.ID)
	app.analyticsClient.Track(analytics.CreateSegmentNewClusterEvent(
		&analytics.NewClusterEventOpts{
			UserId:      fmt.Sprintf("%d", userID),
			ProjId:      fmt.Sprintf("%d", infra.ProjectID),
			ClusterName: form.DOKSName,
			ClusterType: "DOKS",
			EventType:   "destroyed",
		},
	))

	w.WriteHeader(http.StatusOK)
}
