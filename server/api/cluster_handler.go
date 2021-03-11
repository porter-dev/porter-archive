package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"
)

// HandleCreateProjectCluster creates a new cluster
func (app *App) HandleCreateProjectCluster(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateClusterForm{
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
	cluster, err := form.ToCluster()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	cluster, err = app.Repo.Cluster.CreateCluster(cluster)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New cluster created: %d", cluster.ID)

	w.WriteHeader(http.StatusCreated)

	clusterExt := cluster.Externalize()

	if err := json.NewEncoder(w).Encode(clusterExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleReadProjectCluster reads a cluster by id
func (app *App) HandleReadProjectCluster(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	cluster, err := app.Repo.Cluster.ReadCluster(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	clusterExt := cluster.Externalize()

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(clusterExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListProjectClusters returns a list of clusters that have linked Integrations.
func (app *App) HandleListProjectClusters(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	clusters, err := app.Repo.Cluster.ListClustersByProjectID(uint(projID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	extClusters := make([]*models.ClusterExternal, 0)

	for _, cluster := range clusters {
		extClusters = append(extClusters, cluster.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(extClusters); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleUpdateProjectCluster updates a project's cluster
func (app *App) HandleUpdateProjectCluster(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	clusterID, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

	if err != nil || clusterID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.UpdateClusterForm{
		ID: uint(clusterID),
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
	cluster, err := form.ToCluster(app.Repo.Cluster)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	cluster, err = app.Repo.Cluster.UpdateCluster(cluster)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)

	clusterExt := cluster.Externalize()

	if err := json.NewEncoder(w).Encode(clusterExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDeleteProjectCluster handles the deletion of a Cluster via the cluster ID
func (app *App) HandleDeleteProjectCluster(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	cluster, err := app.Repo.Cluster.ReadCluster(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	err = app.Repo.Cluster.DeleteCluster(cluster)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleCreateProjectClusterCandidates handles the creation of ClusterCandidates using
// a kubeconfig and a project id
func (app *App) HandleCreateProjectClusterCandidates(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateClusterCandidatesForm{
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

	// convert the form to a ClusterCandidate
	ccs, err := form.ToClusterCandidates(app.ServerConf.IsLocal)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	extClusters := make([]*models.ClusterCandidateExternal, 0)

	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := session.Values["user_id"].(uint)

	for _, cc := range ccs {
		// handle write to the database
		cc, err = app.Repo.Cluster.CreateClusterCandidate(cc)

		if err != nil {
			app.handleErrorDataWrite(err, w)
			return
		}

		app.Logger.Info().Msgf("New cluster candidate created: %d", cc.ID)

		// if the ClusterCandidate does not have any actions to perform, create the Cluster
		// automatically
		if len(cc.Resolvers) == 0 {
			// we query the repo again to get the decrypted version of the cluster candidate
			cc, err = app.Repo.Cluster.ReadClusterCandidate(cc.ID)

			if err != nil {
				app.handleErrorDataRead(err, w)
				return
			}

			clusterForm := &forms.ResolveClusterForm{
				Resolver:           &models.ClusterResolverAll{},
				ClusterCandidateID: cc.ID,
				ProjectID:          uint(projID),
				UserID:             userID,
			}

			err := clusterForm.ResolveIntegration(*app.Repo)

			if err != nil {
				app.handleErrorDataWrite(err, w)
				return
			}

			cluster, err := clusterForm.ResolveCluster(*app.Repo)

			if err != nil {
				app.handleErrorDataWrite(err, w)
				return
			}

			cc, err = app.Repo.Cluster.UpdateClusterCandidateCreatedClusterID(cc.ID, cluster.ID)

			if err != nil {
				app.handleErrorDataWrite(err, w)
				return
			}

			app.Logger.Info().Msgf("New cluster created: %d", cluster.ID)
		}

		extClusters = append(extClusters, cc.Externalize())
	}

	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(extClusters); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListProjectClusterCandidates returns a list of externalized ClusterCandidates
// ([]models.ClusterCandidateExternal) based on a project ID
func (app *App) HandleListProjectClusterCandidates(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	ccs, err := app.Repo.Cluster.ListClusterCandidatesByProjectID(uint(projID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	extCCs := make([]*models.ClusterCandidateExternal, 0)

	for _, cc := range ccs {
		extCCs = append(extCCs, cc.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(extCCs); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleResolveClusterCandidate accepts a list of resolving objects (ClusterResolver)
// for a given ClusterCandidate, which "resolves" that ClusterCandidate and creates a
// Cluster for a specific project
func (app *App) HandleResolveClusterCandidate(w http.ResponseWriter, r *http.Request) {
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

	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := session.Values["user_id"].(uint)

	// decode actions from request
	resolver := &models.ClusterResolverAll{}

	if err := json.NewDecoder(r.Body).Decode(resolver); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	clusterResolver := &forms.ResolveClusterForm{
		Resolver:           resolver,
		ClusterCandidateID: uint(candID),
		ProjectID:          uint(projID),
		UserID:             userID,
	}

	err = clusterResolver.ResolveIntegration(*app.Repo)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	cluster, err := clusterResolver.ResolveCluster(*app.Repo)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	_, err = app.Repo.Cluster.UpdateClusterCandidateCreatedClusterID(uint(candID), cluster.ID)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New cluster created: %d", cluster.ID)

	clusterExt := cluster.Externalize()

	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(clusterExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
