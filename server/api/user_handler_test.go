package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/test"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/router"

	sessionstore "github.com/porter-dev/porter/internal/auth"
	lr "github.com/porter-dev/porter/internal/logger"
	vr "github.com/porter-dev/porter/internal/validator"
)

func initApi(canQuery bool) (*api.App, *repository.Repository) {
	appConf := config.Conf{
		Debug: true,
		Server: config.ServerConf{
			Port:         8080,
			TimeoutRead:  time.Second * 5,
			TimeoutWrite: time.Second * 10,
			TimeoutIdle:  time.Second * 15,
		},
		// unimportant
		Db: config.DBConf{},
	}

	logger := lr.NewConsole(appConf.Debug)
	validator := vr.New()

	repo := test.NewRepository(canQuery)

	key := []byte("secret") // TODO: change to os.Getenv("SESSION_KEY")
	store, _ := sessionstore.NewStore(db, key)

	return api.New(logger, repo, validator, store), repo
}

func testUserRequest(t *testing.T, c userTest) {
	// create a mock API
	api, repo := initApi(c.canQuery)
	r := router.New(api)

	if c.init != nil {
		c.init(repo)
	}

	req, err := http.NewRequest(
		c.method,
		c.endpoint,
		strings.NewReader(c.body),
	)

	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	// first, check that the status matches
	if status := rr.Code; status != c.expStatus {
		t.Errorf("%s, handler returned wrong status code: got %v want %v",
			c.msg, status, c.expStatus)
	}

	// if there's a validator, call it
	for _, validate := range c.validators {
		validate(rr, c, r, t)
	}
}

type userTest struct {
	init func(repo *repository.Repository)
	msg,
	method,
	endpoint,
	body string
	expStatus  int
	expBody    string
	canQuery   bool
	validators []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T)
}

var createUserTests = []userTest{
	userTest{
		msg:      "Create user",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "hello"
		}`,
		expStatus: http.StatusCreated,
		expBody:   "",
		canQuery:  true,
	},
	userTest{
		msg:      "Create user invalid email",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"email": "notanemail",
			"password": "hello"
		}`,
		expStatus: http.StatusUnprocessableEntity,
		expBody:   `{"code":601,"errors":["email validation failed"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
	userTest{
		msg:      "Create user missing field",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"password": "hello"
		}`,
		expStatus: http.StatusUnprocessableEntity,
		expBody:   `{"code":601,"errors":["required validation failed"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
	userTest{
		msg:      "Create user db connection down",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "hello"
		}`,
		expStatus: http.StatusInternalServerError,
		expBody:   `{"code":500,"errors":["could not read from database"]}`,
		canQuery:  false,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:      "Create user same email",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "hello"
		}`,
		expStatus: http.StatusUnprocessableEntity,
		expBody:   `{"code":601,"errors":["email already taken"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
	userTest{
		msg:      "Create user invalid field type",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"email": "belanger@getporter.dev",
			"password": 0
		}`,
		expStatus: http.StatusBadRequest,
		expBody:   `{"code":600,"errors":["could not process request"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleCreateUser(t *testing.T) {
	for _, c := range createUserTests {
		testUserRequest(t, c)
	}
}

var readUserTests = []userTest{
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
				Clusters: []models.ClusterConfig{
					models.ClusterConfig{
						Name:    "cluster-test",
						Server:  "https://localhost",
						Context: "context-test",
						User:    "test-admin",
					},
				},
				RawKubeConfig: []byte("apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin"),
			})
		},
		msg:       "Read user successful",
		method:    "GET",
		endpoint:  "/api/users/1",
		body:      "",
		expStatus: http.StatusOK,
		expBody:   `{"id":1,"email":"belanger@getporter.dev","clusters":[{"name":"cluster-test","server":"https://localhost","context":"context-test","user":"test-admin"}],"rawKubeConfig":"apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin"}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			UserModelBodyValidator,
		},
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Read user bad id field",
		method:    "GET",
		endpoint:  "/api/users/aldkfjas",
		body:      "",
		expStatus: http.StatusBadRequest,
		expBody:   `{"code":600,"errors":["could not process request"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Read user not found",
		method:    "GET",
		endpoint:  "/api/users/2",
		body:      "",
		expStatus: http.StatusNotFound,
		expBody:   `{"code":602,"errors":["could not find requested object"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleReadUser(t *testing.T) {
	for _, c := range readUserTests {
		testUserRequest(t, c)
	}
}

var readUserClustersTests = []userTest{
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
				Clusters: []models.ClusterConfig{
					models.ClusterConfig{
						Name:    "cluster-test",
						Server:  "https://localhost",
						Context: "context-test",
						User:    "test-admin",
					},
				},
				RawKubeConfig: []byte("apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin"),
			})
		},
		msg:       "Read user successful",
		method:    "GET",
		endpoint:  "/api/users/1/clusters",
		body:      "",
		expStatus: http.StatusOK,
		expBody:   `[{"name":"cluster-test","server":"https://localhost","context":"context-test","user":"test-admin"}]`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			ClusterBodyValidator,
		},
	},
}

func TestHandleReadUserClusters(t *testing.T) {
	for _, c := range readUserClustersTests {
		testUserRequest(t, c)
	}
}

var readUserClustersAllTests = []userTest{
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:         "belanger@getporter.dev",
				Password:      "hello",
				Clusters:      []models.ClusterConfig{},
				RawKubeConfig: []byte("apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin"),
			})
		},
		msg:       "Read user successful",
		method:    "GET",
		endpoint:  "/api/users/1/clusters/all",
		body:      "",
		expStatus: http.StatusOK,
		expBody:   `[{"name":"cluster-test","server":"https://localhost","context":"context-test","user":"test-admin"}]`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			ClusterBodyValidator,
		},
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:         "belanger@getporter.dev",
				Password:      "hello",
				Clusters:      []models.ClusterConfig{},
				RawKubeConfig: []byte("apiVersion: \xc5\n"),
			})
		},
		msg:       "Read user with invalid utf-8 \xc5 in kubeconfig",
		method:    "GET",
		endpoint:  "/api/users/1/clusters/all",
		body:      "",
		expStatus: http.StatusBadRequest,
		expBody:   `{"code":600,"errors":["could not process request"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleReadUserClustersAll(t *testing.T) {
	for _, c := range readUserClustersAllTests {
		testUserRequest(t, c)
	}
}

var updateUserTests = []userTest{
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Update user successful",
		method:    "PUT",
		endpoint:  "/api/users/1",
		body:      `{"rawKubeConfig":"apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin", "allowedClusters":[]}`,
		expStatus: http.StatusNoContent,
		expBody:   "",
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T) {
				req, err := http.NewRequest(
					"GET",
					"/api/users/1",
					strings.NewReader(""),
				)

				if err != nil {
					t.Fatal(err)
				}

				rr2 := httptest.NewRecorder()
				r.ServeHTTP(rr2, req)

				gotBody := &models.UserExternal{}
				expBody := &models.UserExternal{}

				json.Unmarshal(rr2.Body.Bytes(), gotBody)
				json.Unmarshal([]byte(`{"id":1,"email":"belanger@getporter.dev","clusters":[],"rawKubeConfig":"apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin"}`), expBody)

				if !reflect.DeepEqual(gotBody, expBody) {
					t.Errorf("%s, handler returned wrong body: got %v want %v",
						"validator failed", gotBody, expBody)
				}
			},
		},
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Update user invalid id",
		method:    "PUT",
		endpoint:  "/api/users/alsdfjk",
		body:      `{"rawKubeConfig":"apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin", "allowedClusters":[]}`,
		expStatus: http.StatusBadRequest,
		expBody:   `{"code":600,"errors":["could not process request"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Update user bad kubeconfig",
		method:    "PUT",
		endpoint:  "/api/users/1",
		body:      `{"rawKubeConfig":"notvalidyaml", "allowedClusters":[]}`,
		expStatus: http.StatusBadRequest,
		expBody:   `{"code":600,"errors":["could not process request"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Update user db connection down",
		method:    "PUT",
		endpoint:  "/api/users/1",
		body:      `{"rawKubeConfig":"apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin", "allowedClusters":[]}`,
		expStatus: http.StatusInternalServerError,
		expBody:   `{"code":500,"errors":["could not write to database"]}`,
		canQuery:  false,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleUpdateUser(t *testing.T) {
	for _, c := range updateUserTests {
		testUserRequest(t, c)
	}
}

var deleteUserTests = []userTest{
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Delete user successful",
		method:    "DELETE",
		endpoint:  "/api/users/1",
		body:      `{"password":"hello"}`,
		expStatus: http.StatusNoContent,
		expBody:   "",
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T) {
				req, err := http.NewRequest(
					"GET",
					"/api/users/1",
					strings.NewReader(""),
				)

				if err != nil {
					t.Fatal(err)
				}

				rr2 := httptest.NewRecorder()

				r.ServeHTTP(rr2, req)

				gotBody := &models.UserExternal{}
				expBody := &models.UserExternal{}

				if status := rr2.Code; status != 404 {
					t.Errorf("DELETE user validation, handler returned wrong status code: got %v want %v",
						status, 404)
				}

				json.Unmarshal(rr2.Body.Bytes(), gotBody)
				json.Unmarshal([]byte(`{"code":602,"errors":["could not find requested object"]}`), expBody)

				if !reflect.DeepEqual(gotBody, expBody) {
					t.Errorf("%s, handler returned wrong body: got %v want %v",
						"validator failed", gotBody, expBody)
				}
			},
		},
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Delete user invalid id",
		method:    "DELETE",
		endpoint:  "/api/users/aldkjf",
		body:      `{"password":"hello"}`,
		expStatus: http.StatusBadRequest,
		expBody:   `{"code":600,"errors":["could not process request"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Delete user missing password",
		method:    "DELETE",
		endpoint:  "/api/users/1",
		body:      `{}`,
		expStatus: http.StatusUnprocessableEntity,
		expBody:   `{"code":601,"errors":["required validation failed"]}`,
		canQuery:  true,
		validators: []func(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleDeleteUser(t *testing.T) {
	for _, c := range deleteUserTests {
		testUserRequest(t, c)
	}
}

func BasicBodyValidator(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T) {
	if body := rr.Body.String(); body != c.expBody {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, body, c.expBody)
	}
}

func UserModelBodyValidator(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T) {
	gotBody := &models.UserExternal{}
	expBody := &models.UserExternal{}

	json.Unmarshal(rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}

func ClusterBodyValidator(rr *httptest.ResponseRecorder, c userTest, r *chi.Mux, t *testing.T) {
	// if status is expected to be 200, parse the body for UserExternal
	gotBody := &[]models.ClusterConfigExternal{}
	expBody := &[]models.ClusterConfigExternal{}

	json.Unmarshal(rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}
