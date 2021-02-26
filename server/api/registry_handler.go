package api

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/oauth"

	"github.com/porter-dev/porter/internal/registry"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"

	"github.com/aws/aws-sdk-go/service/ecr"
)

// HandleCreateRegistry creates a new registry
func (app *App) HandleCreateRegistry(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateRegistry{
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

	// convert the form to a registry
	registry, err := form.ToRegistry(*app.Repo)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	registry, err = app.Repo.Registry.CreateRegistry(registry)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New registry created: %d", registry.ID)

	w.WriteHeader(http.StatusCreated)

	regExt := registry.Externalize()

	if err := json.NewEncoder(w).Encode(regExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListProjectRegistries returns a list of registries for a project
func (app *App) HandleListProjectRegistries(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	regs, err := app.Repo.Registry.ListRegistriesByProjectID(uint(projID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	extRegs := make([]*models.RegistryExternal, 0)

	for _, reg := range regs {
		extRegs = append(extRegs, reg.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(extRegs); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// temp -- token response
type RegTokenResponse struct {
	Token     string     `json:"token"`
	ExpiresAt *time.Time `json:"expires_at"`
}

// HandleGetProjectRegistryECRToken gets an ECR token for a registry
func (app *App) HandleGetProjectRegistryECRToken(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	region := chi.URLParam(r, "region")

	if region == "" {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// list registries and find one that matches the region
	regs, err := app.Repo.Registry.ListRegistriesByProjectID(uint(projID))
	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.AWSIntegrationID != 0 {
			awsInt, err := app.Repo.AWSIntegration.ReadAWSIntegration(reg.AWSIntegrationID)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			if awsInt.AWSRegion == region {
				// get the aws integration and session
				sess, err := awsInt.GetSession()

				if err != nil {
					app.handleErrorDataRead(err, w)
					return
				}

				ecrSvc := ecr.New(sess)

				output, err := ecrSvc.GetAuthorizationToken(&ecr.GetAuthorizationTokenInput{})

				if err != nil {
					app.handleErrorDataRead(err, w)
					return
				}

				token = *output.AuthorizationData[0].AuthorizationToken
				expiresAt = output.AuthorizationData[0].ExpiresAt
			}
		}
	}

	resp := &RegTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleGetProjectRegistryDockerhubToken gets a Dockerhub token for a registry
func (app *App) HandleGetProjectRegistryDockerhubToken(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// list registries and find one that matches the region
	regs, err := app.Repo.Registry.ListRegistriesByProjectID(uint(projID))
	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.BasicIntegrationID != 0 && strings.Contains(reg.URL, "index.docker.io") {
			basic, err := app.Repo.BasicIntegration.ReadBasicIntegration(reg.BasicIntegrationID)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			token = base64.StdEncoding.EncodeToString([]byte(string(basic.Username) + ":" + string(basic.Password)))

			// we'll just set an arbitrary 30-day expiry time (this is not enforced)
			timeExpires := time.Now().Add(30 * 24 * 3600 * time.Second)
			expiresAt = &timeExpires
		}
	}

	resp := &RegTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

type GCRTokenRequestBody struct {
	ServerURL string `json:"server_url"`
}

// HandleGetProjectRegistryGCRToken gets a GCR token for a registry
func (app *App) HandleGetProjectRegistryGCRToken(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	reqBody := &GCRTokenRequestBody{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(reqBody); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// list registries and find one that matches the region
	regs, err := app.Repo.Registry.ListRegistriesByProjectID(uint(projID))
	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.GCPIntegrationID != 0 && strings.Contains(reg.URL, reqBody.ServerURL) {
			_reg := registry.Registry(*reg)

			tokenCache, err := _reg.GetGCRToken(*app.Repo)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			token = string(tokenCache.Token)
			expiresAt = &tokenCache.Expiry
			break
		}
	}

	resp := &RegTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleGetProjectRegistryDOCRToken gets a DOCR token for a registry
func (app *App) HandleGetProjectRegistryDOCRToken(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	reqBody := &GCRTokenRequestBody{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(reqBody); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// list registries and find one that matches the region
	regs, err := app.Repo.Registry.ListRegistriesByProjectID(uint(projID))
	var token string
	var expiresAt *time.Time

	for _, reg := range regs {
		if reg.DOIntegrationID != 0 && strings.Contains(reg.URL, reqBody.ServerURL) {
			oauthInt, err := app.Repo.OAuthIntegration.ReadOAuthIntegration(reg.DOIntegrationID)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			tok, expiry, err := oauth.GetAccessToken(oauthInt, app.DOConf, *app.Repo)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			token = tok
			expiresAt = expiry
			break
		}
	}

	resp := &RegTokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleUpdateProjectRegistry updates a registry
func (app *App) HandleUpdateProjectRegistry(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	registryID, err := strconv.ParseUint(chi.URLParam(r, "registry_id"), 0, 64)

	if err != nil || registryID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.UpdateRegistryForm{
		ID: uint(registryID),
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

	// convert the form to a registry
	registry, err := form.ToRegistry(app.Repo.Registry)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	registry, err = app.Repo.Registry.UpdateRegistry(registry)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)

	regExt := registry.Externalize()

	if err := json.NewEncoder(w).Encode(regExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDeleteProjectRegistry handles the deletion of a Registry via the registry ID
func (app *App) HandleDeleteProjectRegistry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "registry_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	reg, err := app.Repo.Registry.ReadRegistry(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	err = app.Repo.Registry.DeleteRegistry(reg)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleListRepositories returns a list of repositories for a given registry
func (app *App) HandleListRepositories(w http.ResponseWriter, r *http.Request) {
	regID, err := strconv.ParseUint(chi.URLParam(r, "registry_id"), 0, 64)

	if err != nil || regID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	reg, err := app.Repo.Registry.ReadRegistry(uint(regID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	// cast to a registry from registry package
	_reg := registry.Registry(*reg)
	regAPI := &_reg

	repos, err := regAPI.ListRepositories(*app.Repo, app.DOConf)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(repos); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListImages retrieves a list of repo names
func (app *App) HandleListImages(w http.ResponseWriter, r *http.Request) {
	regID, err := strconv.ParseUint(chi.URLParam(r, "registry_id"), 0, 64)

	if err != nil || regID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	repoName := chi.URLParam(r, "*")

	reg, err := app.Repo.Registry.ReadRegistry(uint(regID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	// cast to a registry from registry package
	_reg := registry.Registry(*reg)
	regAPI := &_reg

	imgs, err := regAPI.ListImages(repoName, *app.Repo, app.DOConf)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(imgs); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
