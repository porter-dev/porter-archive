package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"
)

// Enumeration of user API error codes, represented as int64
const (
	ErrProjectDecode ErrorCode = iota + 600
	ErrProjectValidateFields
	ErrProjectDataRead
)

// HandleCreateProject validates a project form entry, converts the project to a gorm
// model, and saves the user to the database
func (app *App) HandleCreateProject(w http.ResponseWriter, r *http.Request) {
	session, err := app.store.Get(r, app.cookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := session.Values["user_id"].(uint)

	form := &forms.CreateProjectForm{}

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

	// convert the form to a project model
	projModel, err := form.ToProject(app.repo.Project)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	projModel, err = app.repo.Project.CreateProject(projModel)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	// create a new Role with the user as the admin
	_, err = app.repo.Project.CreateProjectRole(projModel, &models.Role{
		UserID:    userID,
		ProjectID: projModel.ID,
		Kind:      models.RoleAdmin,
	})

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.logger.Info().Msgf("New project created: %d", projModel.ID)

	w.WriteHeader(http.StatusCreated)

	projExt := projModel.Externalize()

	if err := json.NewEncoder(w).Encode(projExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleReadProject returns an externalized Project (models.ProjectExternal)
// based on an ID
func (app *App) HandleReadProject(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	proj, err := app.repo.Project.ReadProject(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	projExt := proj.Externalize()

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(projExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListProjectClusters returns a list of clusters that have linked ServiceAccounts.
// If multiple service accounts exist for a cluster, the service account created later
// will take precedence. This may be changed in a future release to return multiple
// service accounts.
func (app *App) HandleListProjectClusters(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	sas, err := app.repo.ServiceAccount.ListServiceAccountsByProjectID(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	clusters := make([]*models.ClusterExternal, 0)

	// clusterMapIndex used for checking if cluster has already been added
	// maps from the cluster's endpoint to the index in the cluster array
	clusterMapIndex := make(map[string]int)

	for _, sa := range sas {
		for _, cluster := range sa.Clusters {
			if currIndex, ok := clusterMapIndex[cluster.Server]; ok {
				if clusters[currIndex].ServiceAccountID <= cluster.ServiceAccountID {
					clusters[currIndex] = cluster.Externalize()
					continue
				}
			}

			clusterMapIndex[cluster.Server] = len(clusters)
			clusters = append(clusters, cluster.Externalize())
		}
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(clusters); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleCreateProjectSACandidates handles the creation of ServiceAccountCandidates
// using a kubeconfig and a project id
func (app *App) HandleCreateProjectSACandidates(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateServiceAccountCandidatesForm{
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

	// convert the form to a ServiceAccountCandidate
	saCandidates, err := form.ToServiceAccountCandidates()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	extSACandidates := make([]*models.ServiceAccountCandidateExternal, 0)

	for _, saCandidate := range saCandidates {
		// handle write to the database
		saCandidate, err = app.repo.ServiceAccount.CreateServiceAccountCandidate(saCandidate)

		if err != nil {
			app.handleErrorDataWrite(err, w)
			return
		}

		app.logger.Info().Msgf("New service account candidate created: %d", saCandidate.ID)

		// if the SA candidate does not have any actions to perform, create the ServiceAccount
		// automatically
		if len(saCandidate.Actions) == 0 {
			saForm := &forms.ServiceAccountActionResolver{
				ServiceAccountCandidateID: saCandidate.ID,
				SACandidate:               saCandidate,
			}

			err := saForm.PopulateServiceAccount(app.repo.ServiceAccount)

			if err != nil {
				app.handleErrorDataWrite(err, w)
				return
			}

			sa, err := app.repo.ServiceAccount.CreateServiceAccount(saForm.SA)

			if err != nil {
				app.handleErrorDataWrite(err, w)
				return
			}

			app.logger.Info().Msgf("New service account created: %d", sa.ID)
		}

		extSACandidates = append(extSACandidates, saCandidate.Externalize())
	}

	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(extSACandidates); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListProjectSACandidates returns a list of externalized ServiceAccountCandidate
// ([]models.ServiceAccountCandidateExternal) based on a project ID
func (app *App) HandleListProjectSACandidates(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	saCandidates, err := app.repo.ServiceAccount.ListServiceAccountCandidatesByProjectID(uint(projID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	extSACandidates := make([]*models.ServiceAccountCandidateExternal, 0)

	for _, saCandidate := range saCandidates {
		extSACandidates = append(extSACandidates, saCandidate.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(extSACandidates); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleResolveSACandidateActions accepts a list of action configurations for a
// given ServiceAccountCandidate, which "resolves" that ServiceAccountCandidate
// and creates a ServiceAccount for a specific project
func (app *App) HandleResolveSACandidateActions(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	candID, err := strconv.ParseUint(chi.URLParam(r, "candidate_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// decode actions from request
	actions := make([]*models.ServiceAccountAllActions, 0)

	if err := json.NewDecoder(r.Body).Decode(&actions); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	var saResolverBase *forms.ServiceAccountActionResolver = &forms.ServiceAccountActionResolver{
		ServiceAccountCandidateID: uint(candID),
		SA:                        nil,
		SACandidate:               nil,
	}

	// for each action, create the relevant form and populate the service account
	// we'll chain the .PopulateServiceAccount functions
	for _, action := range actions {
		var err error
		switch action.Name {
		case models.ClusterCADataAction:
			form := &forms.ClusterCADataAction{
				ServiceAccountActionResolver: saResolverBase,
				ClusterCAData:                action.ClusterCAData,
			}

			err = form.PopulateServiceAccount(app.repo.ServiceAccount)
		case models.ClientCertDataAction:
			form := &forms.ClientCertDataAction{
				ServiceAccountActionResolver: saResolverBase,
				ClientCertData:               action.ClientCertData,
			}

			err = form.PopulateServiceAccount(app.repo.ServiceAccount)
		case models.ClientKeyDataAction:
			form := &forms.ClientKeyDataAction{
				ServiceAccountActionResolver: saResolverBase,
				ClientKeyData:                action.ClientKeyData,
			}

			err = form.PopulateServiceAccount(app.repo.ServiceAccount)
		case models.OIDCIssuerDataAction:
			form := &forms.OIDCIssuerDataAction{
				ServiceAccountActionResolver: saResolverBase,
				OIDCIssuerCAData:             action.OIDCIssuerCAData,
			}

			err = form.PopulateServiceAccount(app.repo.ServiceAccount)
		case models.TokenDataAction:
			form := &forms.TokenDataAction{
				ServiceAccountActionResolver: saResolverBase,
				TokenData:                    action.TokenData,
			}

			err = form.PopulateServiceAccount(app.repo.ServiceAccount)
		case models.GCPKeyDataAction:
			form := &forms.GCPKeyDataAction{
				ServiceAccountActionResolver: saResolverBase,
				GCPKeyData:                   action.GCPKeyData,
			}

			err = form.PopulateServiceAccount(app.repo.ServiceAccount)
		case models.AWSDataAction:
			form := &forms.AWSDataAction{
				ServiceAccountActionResolver: saResolverBase,
				AWSAccessKeyID:               action.AWSAccessKeyID,
				AWSSecretAccessKey:           action.AWSSecretAccessKey,
				AWSClusterID:                 action.AWSClusterID,
			}

			err = form.PopulateServiceAccount(app.repo.ServiceAccount)
		}

		if err != nil {
			app.handleErrorFormDecoding(err, ErrProjectDecode, w)
			return
		}
	}

	sa, err := app.repo.ServiceAccount.CreateServiceAccount(saResolverBase.SA)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	if sa != nil {
		app.logger.Info().Msgf("New service account created: %d", sa.ID)

		saExternal := sa.Externalize()

		w.WriteHeader(http.StatusCreated)

		if err := json.NewEncoder(w).Encode(saExternal); err != nil {
			app.handleErrorFormDecoding(err, ErrProjectDecode, w)
			return
		}
	} else {
		w.WriteHeader(http.StatusNotModified)
	}
}

// HandleDeleteProject deletes a project from the db, reading from the project_id
// in the URL param
func (app *App) HandleDeleteProject(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	proj, err := app.repo.Project.ReadProject(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	proj, err = app.repo.Project.DeleteProject(proj)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	projExternal := proj.Externalize()

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(projExternal); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
