package api

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"

	"github.com/porter-dev/porter/internal/models/integrations"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// HandleListClusterIntegrations lists the cluster integrations available to the
// instance
func (app *App) HandleListClusterIntegrations(w http.ResponseWriter, r *http.Request) {
	clusters := ints.PorterClusterIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&clusters); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListRegistryIntegrations lists the image registry integrations available to the
// instance
func (app *App) HandleListRegistryIntegrations(w http.ResponseWriter, r *http.Request) {
	registries := ints.PorterRegistryIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&registries); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListHelmRepoIntegrations lists the Helm repo integrations available to the
// instance
func (app *App) HandleListHelmRepoIntegrations(w http.ResponseWriter, r *http.Request) {
	hrs := ints.PorterHelmRepoIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&hrs); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListRepoIntegrations lists the repo integrations available to the
// instance
func (app *App) HandleListRepoIntegrations(w http.ResponseWriter, r *http.Request) {
	repos := ints.PorterGitRepoIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&repos); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleCreateGCPIntegration creates a new GCP integration in the DB
func (app *App) HandleCreateGCPIntegration(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateGCPIntegrationForm{
		UserID:    userID,
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

	// convert the form to a gcp integration
	gcp, err := form.ToGCPIntegration()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	gcp, err = app.Repo.GCPIntegration.CreateGCPIntegration(gcp)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New gcp integration created: %d", gcp.ID)

	w.WriteHeader(http.StatusCreated)

	gcpExt := gcp.Externalize()

	if err := json.NewEncoder(w).Encode(gcpExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleCreateAWSIntegration creates a new AWS integration in the DB
func (app *App) HandleCreateAWSIntegration(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateAWSIntegrationForm{
		UserID:    userID,
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

	// convert the form to a aws integration
	aws, err := form.ToAWSIntegration()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	aws, err = app.Repo.AWSIntegration.CreateAWSIntegration(aws)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New aws integration created: %d", aws.ID)

	w.WriteHeader(http.StatusCreated)

	awsExt := aws.Externalize()

	if err := json.NewEncoder(w).Encode(awsExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleOverwriteAWSIntegration overwrites the ID of an AWS integration in the DB
func (app *App) HandleOverwriteAWSIntegration(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	awsIntegrationID, err := strconv.ParseUint(chi.URLParam(r, "aws_integration_id"), 0, 64)

	if err != nil || awsIntegrationID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.OverwriteAWSIntegrationForm{
		UserID:    userID,
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

	// read the aws integration by ID and overwrite the access id/secret
	awsIntegration, err := app.Repo.AWSIntegration.ReadAWSIntegration(uint(awsIntegrationID))

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	awsIntegration.AWSAccessKeyID = []byte(form.AWSAccessKeyID)
	awsIntegration.AWSSecretAccessKey = []byte(form.AWSSecretAccessKey)

	// handle write to the database
	awsIntegration, err = app.Repo.AWSIntegration.OverwriteAWSIntegration(awsIntegration)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	// clear the cluster token cache if cluster_id exists
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	if len(vals["cluster_id"]) > 0 {
		clusterID, err := strconv.ParseUint(vals["cluster_id"][0], 10, 64)

		if err != nil {
			app.handleErrorDataWrite(err, w)
			return
		}

		cluster, err := app.Repo.Cluster.ReadCluster(uint(clusterID))

		// clear the token
		cluster.TokenCache.Token = []byte("")

		cluster, err = app.Repo.Cluster.UpdateClusterTokenCache(&cluster.TokenCache)

		if err != nil {
			app.handleErrorDataWrite(err, w)
			return
		}
	}

	app.Logger.Info().Msgf("AWS integration overwritten: %d", awsIntegration.ID)

	w.WriteHeader(http.StatusCreated)

	awsExt := awsIntegration.Externalize()

	if err := json.NewEncoder(w).Encode(awsExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleCreateBasicAuthIntegration creates a new basic auth integration in the DB
func (app *App) HandleCreateBasicAuthIntegration(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateBasicAuthIntegrationForm{
		UserID:    userID,
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

	// convert the form to a gcp integration
	basic, err := form.ToBasicIntegration()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	basic, err = app.Repo.BasicIntegration.CreateBasicIntegration(basic)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New basic integration created: %d", basic.ID)

	w.WriteHeader(http.StatusCreated)

	basicExt := basic.Externalize()

	if err := json.NewEncoder(w).Encode(basicExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListProjectOAuthIntegrations lists the oauth integrations for the project
func (app *App) HandleListProjectOAuthIntegrations(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	oauthInts, err := app.Repo.OAuthIntegration.ListOAuthIntegrationsByProjectID(uint(projID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	res := make([]*integrations.OAuthIntegrationExternal, 0)

	for _, oauthInt := range oauthInts {
		res = append(res, oauthInt.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(res); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

func (app *App) HandleGithubAppEvent(w http.ResponseWriter, r *http.Request) {

}
