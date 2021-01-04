package api

import (
	"encoding/json"
	"net/http"
	"strconv"

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
	registry, err := form.ToRegistry()

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
type ECRTokenResponse struct {
	Token string `json:"token"`
}

// HandleGetProjectRegistryECRToken gets an ECR token for a registry
func (app *App) HandleGetProjectRegistryECRToken(w http.ResponseWriter, r *http.Request) {
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

	// handle write to the database
	reg, err := app.Repo.Registry.ReadRegistry(uint(registryID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// get the aws integration and session
	awsInt, err := app.Repo.AWSIntegration.ReadAWSIntegration(reg.AWSIntegrationID)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

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

	resp := &ECRTokenResponse{
		Token: *output.AuthorizationData[0].AuthorizationToken,
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

	repos, err := regAPI.ListRepositories(*app.Repo)

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

	imgs, err := regAPI.ListImages(repoName, *app.Repo)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(imgs); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// ref, err := name.ParseReference("gcr.io/google-containers/pause")
	// if err != nil {
	// 	fmt.Println(err)
	// 	return
	// }

	// img, err := remote.Image(ref)
	// if err != nil {
	// 	fmt.Println(err)
	// 	return
	// }
	// fmt.Println(img.Size())

	// ctx := r.Context()
	// reg, err := name.NewRegistry("index.docker.io")
	// if err != nil {
	// 	fmt.Println("fuk")
	// 	fmt.Println(err)
	// 	return
	// }

	// stuff, err := remote.Catalog(ctx, reg, remote.WithAuthFromKeychain(authn.DefaultKeychain))
	// if err != nil {
	// 	fmt.Println(err)
	// 	return
	// }
	// fmt.Println(stuff[0])
}
