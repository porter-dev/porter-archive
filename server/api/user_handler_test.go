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

	return api.New(logger, repo, validator), repo
}

type userTest struct {
	init func(repo *repository.Repository)
	msg,
	method,
	endpoint,
	body string
	expStatus int
	expBody   string
	canQuery  bool
	validate  func(r *chi.Mux, t *testing.T)
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
	},
	userTest{
		msg:      "Create user cannot write to db",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "hello"
		}`,
		expStatus: http.StatusInternalServerError,
		expBody:   `{"code":500,"errors":["Could not read from database"]}`,
		canQuery:  false,
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
	},
}

func TestHandleCreateUser(t *testing.T) {
	for _, c := range createUserTests {
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

		if status := rr.Code; status != c.expStatus {
			t.Errorf("%s, handler returned wrong status code: got %v want %v",
				c.msg, status, c.expStatus)
		}

		if body := rr.Body.String(); body != c.expBody {
			t.Errorf("%s, handler returned wrong body: got %v want %v",
				c.msg, body, c.expBody)
		}
	}
}

var readUserTests = []userTest{
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{
				Email:    "belanger@getporter.dev",
				Password: "hello",
			})
		},
		msg:       "Read user successful",
		method:    "GET",
		endpoint:  "/api/users/1",
		body:      "",
		expStatus: http.StatusOK,
		expBody:   `{"id":1,"email":"belanger@getporter.dev","clusters":[],"rawKubeConfig":""}`,
		canQuery:  true,
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
		expBody:   `{"code":600,"errors":["Could not process request"]}`,
		canQuery:  true,
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
		expBody:   `{"code":602,"errors":["Could not find requested object"]}`,
		canQuery:  true,
	},
}

func TestHandleReadUser(t *testing.T) {
	for _, c := range readUserTests {
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

		if status := rr.Code; status != c.expStatus {
			t.Errorf("%s, handler returned wrong status code: got %v want %v",
				c.msg, status, c.expStatus)
		}

		if status := rr.Code; status == 200 {
			// if status is expected to be 200, parse the body for UserExternal
			gotBody := &models.UserExternal{}
			expBody := &models.UserExternal{}

			json.Unmarshal(rr.Body.Bytes(), gotBody)
			json.Unmarshal([]byte(c.expBody), expBody)

			if !reflect.DeepEqual(gotBody, expBody) {
				t.Errorf("%s, handler returned wrong body: got %v want %v",
					c.msg, gotBody, expBody)
			}
		} else {
			// if status is expected to not be 200, look for error
			if body := rr.Body.String(); body != c.expBody {
				t.Errorf("%s, handler returned wrong body: got %v want %v",
					c.msg, body, c.expBody)
			}
		}
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
		expStatus: http.StatusAccepted,
		expBody:   "",
		canQuery:  true,
		validate: func(r *chi.Mux, t *testing.T) {
			req, err := http.NewRequest(
				"GET",
				"/api/users/1",
				strings.NewReader(""),
			)

			if err != nil {
				t.Fatal(err)
			}

			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

			gotBody := &models.UserExternal{}
			expBody := &models.UserExternal{}

			json.Unmarshal(rr.Body.Bytes(), gotBody)
			json.Unmarshal([]byte(`{"id":1,"email":"belanger@getporter.dev","clusters":[],"rawKubeConfig":"apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin"}`), expBody)

			if !reflect.DeepEqual(gotBody, expBody) {
				t.Errorf("%s, handler returned wrong body: got %v want %v",
					"validator failed", gotBody, expBody)
			}
		},
	},
}

func TestHandleUpdateUser(t *testing.T) {
	for _, c := range updateUserTests {
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

		if status := rr.Code; status != c.expStatus {
			t.Errorf("%s, handler returned wrong status code: got %v want %v",
				c.msg, status, c.expStatus)
		}

		if body := rr.Body.String(); body != c.expBody {
			t.Errorf("%s, handler returned wrong body: got %v want %v",
				c.msg, body, c.expBody)
		}

		c.validate(r, t)
	}
}
