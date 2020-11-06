package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/sessions"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository/gorm"

	"github.com/porter-dev/porter/server/api"

	"github.com/porter-dev/porter/internal/adapter"
	sessionstore "github.com/porter-dev/porter/internal/auth"
	"github.com/porter-dev/porter/internal/config"
	lr "github.com/porter-dev/porter/internal/logger"
	vr "github.com/porter-dev/porter/internal/validator"
	"github.com/porter-dev/porter/server/router"
)

func main() {
	appConf := config.FromEnv()

	logger := lr.NewConsole(appConf.Debug)
	db, err := adapter.New(&appConf.Db)

	if err != nil {
		logger.Fatal().Err(err).Msg("")
		return
	}

	var key [32]byte

	for i, b := range []byte(appConf.Db.EncryptionKey) {
		key[i] = b
	}

	repo := gorm.NewRepository(db, &key)

	// upsert admin if config requires
	// if appConf.Db.AdminInit {
	// 	err := upsertAdmin(repo.User, appConf.Db.AdminEmail, appConf.Db.AdminPassword)

	// 	if err != nil {
	// 		fmt.Println("Error while upserting admin: " + err.Error())
	// 	}
	// }

	// declare as Store interface (methods Get, New, Save)
	var store sessions.Store
	store, _ = sessionstore.NewStore(repo, appConf.Server)

	validator := vr.New()

	a := api.New(
		logger,
		repo,
		validator,
		store,
		appConf.Server.CookieName,
		false,
		&oauth.Config{
			ClientID:     appConf.Server.GithubClientID,
			ClientSecret: appConf.Server.GithubClientSecret,
			Scopes:       []string{"repo", "user", "read:user"},
			BaseURL:      appConf.Server.ServerURL,
		},
	)

	appRouter := router.New(a, store, appConf.Server.CookieName, appConf.Server.StaticFilePath, repo)

	address := fmt.Sprintf(":%d", appConf.Server.Port)

	logger.Info().Msgf("Starting server %v", address)

	s := &http.Server{
		Addr:         address,
		Handler:      appRouter,
		ReadTimeout:  appConf.Server.TimeoutRead,
		WriteTimeout: appConf.Server.TimeoutWrite,
		IdleTimeout:  appConf.Server.TimeoutIdle,
	}

	if err := s.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal("Server startup failed")
	}
}

// func upsertAdmin(repo repository.UserRepository, email, pw string) error {
// 	admUser, err := repo.ReadUserByEmail(email)

// 	// create the user in this case
// 	if err != nil {
// 		form := forms.CreateUserForm{
// 			Email:    email,
// 			Password: pw,
// 		}

// 		admUser, err = form.ToUser(repo)

// 		if err != nil {
// 			return err
// 		}

// 		admUser, err = repo.CreateUser(admUser)

// 		if err != nil {
// 			return err
// 		}
// 	}

// 	filename := "/porter/porter.kubeconfig"

// 	// read if kubeconfig file exists, if it does update the user
// 	if _, err := os.Stat(filename); !os.IsNotExist(err) {
// 		fileBytes, err := ioutil.ReadFile(filename)

// 		contexts := make([]string, 0)
// 		allContexts, err := kubernetes.GetContextsFromBytes(fileBytes, []string{})

// 		if err != nil {
// 			return err
// 		}

// 		for _, context := range allContexts {
// 			contexts = append(contexts, context.Name)
// 		}

// 		form := forms.UpdateUserForm{
// 			ID:              admUser.ID,
// 			RawKubeConfig:   string(fileBytes),
// 			AllowedContexts: contexts,
// 		}

// 		admUser, err = form.ToUser(repo)

// 		if err != nil {
// 			return err
// 		}

// 		admUser, err = repo.UpdateUser(admUser)

// 		if err != nil {
// 			return err
// 		}
// 	}

// 	return nil
// }
