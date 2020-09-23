package api

import (
	"encoding/json"
	"net/http"

	"github.com/porter-dev/porter/internal/queries"

	"github.com/porter-dev/porter/internal/models"
)

// HandleCreateUser validates a user form entry, converts the user to a gorm
// model, and saves the user to the database
func (app *App) HandleCreateUser(w http.ResponseWriter, r *http.Request) {
	form := &models.CreateUserForm{}

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleUnprocessableEntity(err, w)
		return
	}

	if err := app.validator.Struct(form); err != nil {
		app.handleUnprocessableEntity(err, w)
		return
	}

	userModel, err := form.ToUser()

	if err != nil {
		app.handleUnprocessableEntity(err, w)
		return
	}

	user, err := queries.CreateUser(app.db, userModel)

	if err != nil {
		app.handleDataWriteFailure(err, w)
		return
	}

	app.logger.Info().Msgf("New user created: %d", user.ID)

	w.WriteHeader(http.StatusCreated)
}

// HandleReadUser is majestic
func (app *App) HandleReadUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("{}"))
}

// HandleUpdateUser is majestic
func (app *App) HandleUpdateUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
}

// HandleDeleteUser is majestic
func (app *App) HandleDeleteUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
}

// GenerateUser creates a new user based on a unique ID and a kubeconfig
// func GenerateUser(id string, kubeconfig []byte) *User {
// 	conf := kubernetes.KubeConfig{}

// 	err := yaml.Unmarshal(kubeconfig, &conf)

// 	// TODO -- HANDLE ERROR
// 	if err != nil {
// 		fmt.Println("ERROR IN UNMARSHALING")
// 	}

// 	// generate the user's clusters
// 	clusters := conf.ToClusterConfigs()

// 	return &User{
// 		ID:            id,
// 		Clusters:      clusters,
// 		RawKubeConfig: kubeconfig,
// 	}
// }

// // printUser is a helper function to print a user's config without sensitive information
// func (u *User) printUser() {
// 	for _, cluster := range u.Clusters {
// 		fmt.Println(cluster.Name, cluster.Context, cluster.Server, cluster.User)
// 	}
// }
