package api_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"time"

	"github.com/go-chi/chi"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/config/loader"
	"github.com/porter-dev/porter/internal/adapter"
	"github.com/porter-dev/porter/internal/auth/sessionstore"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/kubernetes"
	lr "github.com/porter-dev/porter/internal/logger"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/router"
)

type tester struct {
	app    *api.App
	repo   repository.Repository
	store  *sessionstore.PGStore
	router *chi.Mux
	req    *http.Request
	rr     *httptest.ResponseRecorder
	cookie *http.Cookie
}

func (t *tester) execute() {
	t.router.ServeHTTP(t.rr, t.req)
}

func (t *tester) reset() {
	t.rr = httptest.NewRecorder()
	t.req = nil
}

func (t *tester) createUserSession(email string, pw string) {
	req, err := http.NewRequest(
		"POST",
		"/api/users",
		strings.NewReader(`{"email":"`+email+`","password":"`+pw+`"}`),
	)

	if err != nil {
		panic(err)
	}

	t.req = req
	t.execute()

	if cookies := t.rr.Result().Cookies(); len(cookies) > 0 {
		t.cookie = cookies[0]
	}

	t.reset()
}

func newTester(canQuery bool) *tester {
	appConf := loader.EnvConf{
		ServerConf: &config.ServerConf{
			Debug:                true,
			Port:                 8080,
			CookieName:           "porter",
			CookieSecrets:        []string{"secret"},
			TimeoutRead:          time.Second * 5,
			TimeoutWrite:         time.Second * 10,
			TimeoutIdle:          time.Second * 15,
			IsTesting:            true,
			TokenGeneratorSecret: "secret",
			BasicLoginEnabled:    true,
		},
		// unimportant here
		DBConf: &config.DBConf{},
	}

	logger := lr.NewConsole(appConf.ServerConf.Debug)

	db, _ := adapter.New(&config.DBConf{
		EncryptionKey: "__random_strong_encryption_key__",
		SQLLite:       true,
		SQLLitePath:   "api_test.db",
	})

	db.AutoMigrate(
		&models.Project{},
		&models.Role{},
		&models.User{},
		&models.Session{},
		&models.GitRepo{},
		&models.Registry{},
		&models.Release{},
		&models.HelmRepo{},
		&models.Cluster{},
		&models.ClusterCandidate{},
		&models.ClusterResolver{},
		&models.Infra{},
		&models.GitActionConfig{},
		&models.Invite{},
		&ints.KubeIntegration{},
		&ints.BasicIntegration{},
		&ints.OIDCIntegration{},
		&ints.OAuthIntegration{},
		&ints.GCPIntegration{},
		&ints.AWSIntegration{},
		&ints.ClusterTokenCache{},
		&ints.RegTokenCache{},
		&ints.HelmRepoTokenCache{},
		&ints.GithubAppInstallation{},
	)

	var key [32]byte

	for i, b := range []byte("__random_strong_encryption_key__") {
		key[i] = b
	}

	repo := gorm.NewRepository(db, &key)
	store, _ := sessionstore.NewStore(
		&sessionstore.NewStoreOpts{
			SessionRepository: repo.Session(),
			CookieSecrets:     []string{"secret"},
		},
	)
	k8sAgent := kubernetes.GetAgentTesting()

	app, _ := api.New(&api.AppConfig{
		Logger:     logger,
		Repository: repo,
		ServerConf: appConf.ServerConf,
		TestAgents: &api.TestAgents{
			HelmAgent:             helm.GetAgentTesting(&helm.Form{}, nil, logger, k8sAgent),
			HelmTestStorageDriver: helm.StorageMap["memory"](nil, nil, ""),
			K8sAgent:              k8sAgent,
		},
	})

	r := router.New(app)

	return &tester{
		app:    app,
		repo:   repo,
		store:  store,
		router: r,
		req:    nil,
		rr:     httptest.NewRecorder(),
		cookie: nil,
	}
}
