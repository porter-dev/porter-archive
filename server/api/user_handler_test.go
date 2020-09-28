package api_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/test"
	"github.com/porter-dev/porter/server/api"
	"github.com/porter-dev/porter/server/requestlog"

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
		expBody:   `{"code":1,"errors":["email validation failed"]}`,
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
		expBody:   `{"code":1,"errors":["required validation failed"]}`,
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
		expBody:   `{"code":2,"errors":["data write error"]}`,
		canQuery:  false,
	},
	userTest{
		init: func(repo *repository.Repository) {
			repo.User.CreateUser(&models.User{})
		},
		msg:      "Create user same email",
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
}

func TestHandleCreateUser(t *testing.T) {
	for _, c := range createUserTests {
		// create a mock API
		api, repo := initApi(c.canQuery)

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
		handler := requestlog.NewHandler(api.HandleCreateUser, api.Logger())

		handler.ServeHTTP(rr, req)

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

// var readUserTests = []userTest
