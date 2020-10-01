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

type tester struct {
	app    *api.App
	repo   *repository.Repository
	store  *sessionstore.PGStore
	router *chi.Mux
	req    *http.Request
	rr     *httptest.ResponseRecorder
	cookie *http.Cookie
}

type userTest struct {
	initializers []func(t *tester)
	msg          string
	method       string
	endpoint     string
	body         string
	expStatus    int
	expBody      string
	useCookie    bool
	validators   []func(c *userTest, tester *tester, t *testing.T)
}

func (t *tester) execute() {
	t.router.ServeHTTP(t.rr, t.req)
}

func (t *tester) reset() {
	t.rr = httptest.NewRecorder()
	t.req = nil
}

func (t *tester) createUserSession(email string, pw string) {
	req, _ := http.NewRequest(
		"POST",
		"/api/users",
		strings.NewReader(`{"email":"`+email+`","password":"`+pw+`"}`),
	)

	t.req = req
	t.execute()

	if cookies := t.rr.Result().Cookies(); len(cookies) > 0 {
		t.cookie = cookies[0]
	}

	t.reset()
}

func initUserDefault(tester *tester) {
	tester.createUserSession("belanger@getporter.dev", "hello")
}

func initUserWithClusters(tester *tester) {
	initUserDefault(tester)

	user, _ := tester.repo.User.ReadUserByEmail("belanger@getporter.dev")
	user.Clusters = []models.ClusterConfig{
		models.ClusterConfig{
			Name:    "cluster-test",
			Server:  "https://localhost",
			Context: "context-test",
			User:    "test-admin",
		},
	}
	user.RawKubeConfig = []byte("apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin")

	tester.repo.User.UpdateUser(user)
}

func newTester(canQuery bool) *tester {
	appConf := config.Conf{
		Debug: true,
		Server: config.ServerConf{
			Port:          8080,
			CookieName:    "porter",
			CookieSecrets: [][]byte{[]byte("secret")},
			TimeoutRead:   time.Second * 5,
			TimeoutWrite:  time.Second * 10,
			TimeoutIdle:   time.Second * 15,
		},
		// unimportant here
		Db: config.DBConf{},
	}

	logger := lr.NewConsole(appConf.Debug)
	validator := vr.New()

	repo := test.NewRepository(canQuery)

	store, _ := sessionstore.NewStore(repo, appConf.Server)
	app := api.New(logger, repo, validator, store, appConf.Server.CookieName)
	r := router.New(app, store, appConf.Server.CookieName)

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

func testUserRequests(t *testing.T, tests []*userTest, canQuery bool) {
	for _, c := range tests {
		// create a new tester
		tester := newTester(canQuery)

		// if there's an initializer, call it
		for _, init := range c.initializers {
			init(tester)
		}

		req, err := http.NewRequest(
			c.method,
			c.endpoint,
			strings.NewReader(c.body),
		)

		tester.req = req

		if c.useCookie {
			req.AddCookie(tester.cookie)
		}

		if err != nil {
			t.Fatal(err)
		}

		tester.execute()
		rr := tester.rr

		// first, check that the status matches
		if status := rr.Code; status != c.expStatus {
			t.Errorf("%s, handler returned wrong status code: got %v want %v",
				c.msg, status, c.expStatus)
		}

		// if there's a validator, call it
		for _, validate := range c.validators {
			validate(c, tester, t)
		}
	}
}

var createUserTests = []*userTest{
	&userTest{
		msg:      "Create user",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "hello"
		}`,
		expStatus: http.StatusCreated,
		expBody:   "",
	},
	&userTest{
		msg:      "Create user invalid email",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"email": "notanemail",
			"password": "hello"
		}`,
		expStatus: http.StatusUnprocessableEntity,
		expBody:   `{"code":601,"errors":["email validation failed"]}`,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
	&userTest{
		msg:      "Create user missing field",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"password": "hello"
		}`,
		expStatus: http.StatusUnprocessableEntity,
		expBody:   `{"code":601,"errors":["required validation failed"]}`,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
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
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
	&userTest{
		msg:      "Create user invalid field type",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
			"email": "belanger@getporter.dev",
			"password": 0
		}`,
		expStatus: http.StatusBadRequest,
		expBody:   `{"code":600,"errors":["could not process request"]}`,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleCreateUser(t *testing.T) {
	testUserRequests(t, createUserTests, true)
}

var createUserTestsWriteFail = []*userTest{
	&userTest{
		msg:      "Create user db connection down",
		method:   "POST",
		endpoint: "/api/users",
		body: `{
		"email": "belanger@getporter.dev",
		"password": "hello"
	}`,
		expStatus: http.StatusInternalServerError,
		expBody:   `{"code":500,"errors":["could not read from database"]}`,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleCreateUserWriteFail(t *testing.T) {
	testUserRequests(t, createUserTestsWriteFail, false)
}

var loginUserTests = []*userTest{
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:      "Login user successful",
		method:   "POST",
		endpoint: "/api/login",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "hello"
		}`,
		expStatus: http.StatusOK,
		expBody:   ``,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:      "Login user already logged in",
		method:   "POST",
		endpoint: "/api/login",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "hello"
		}`,
		expStatus: http.StatusOK,
		expBody:   ``,
		useCookie: true,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
	&userTest{
		msg:      "Login user unregistered email",
		method:   "POST",
		endpoint: "/api/login",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "hello"
		}`,
		expStatus: http.StatusUnauthorized,
		expBody:   `{"code":401,"errors":["email not registered"]}`,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:      "Login user incorrect password",
		method:   "POST",
		endpoint: "/api/login",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "notthepassword"
		}`,
		expStatus: http.StatusUnauthorized,
		expBody:   `{"code":401,"errors":["incorrect password"]}`,
		useCookie: true,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleLoginUser(t *testing.T) {
	testUserRequests(t, loginUserTests, true)
}

var logoutUserTests = []*userTest{
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:      "Logout user successful",
		method:   "POST",
		endpoint: "/api/logout",
		body: `{
			"email": "belanger@getporter.dev",
			"password": "hello"
		}`,
		expStatus: http.StatusOK,
		expBody:   ``,
		useCookie: true,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			func(c *userTest, tester *tester, t *testing.T) {
				req, err := http.NewRequest(
					"GET",
					"/api/users/1",
					strings.NewReader(""),
				)

				req.AddCookie(tester.cookie)

				if err != nil {
					t.Fatal(err)
				}

				rr2 := httptest.NewRecorder()
				tester.router.ServeHTTP(rr2, req)

				if status := rr2.Code; status != http.StatusForbidden {
					t.Errorf("%s, handler returned wrong status: got %v want %v",
						"validator failed", status, http.StatusForbidden)
				}
			},
		},
	},
}

func TestHandleLogoutUser(t *testing.T) {
	testUserRequests(t, logoutUserTests, true)
}

var readUserTests = []*userTest{
	&userTest{
		initializers: []func(tester *tester){
			initUserWithClusters,
		},
		msg:       "Read user successful",
		method:    "GET",
		endpoint:  "/api/users/1",
		body:      "",
		expStatus: http.StatusOK,
		expBody:   `{"id":1,"email":"belanger@getporter.dev","clusters":[{"name":"cluster-test","server":"https://localhost","context":"context-test","user":"test-admin"}],"rawKubeConfig":"apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin"}`,
		useCookie: true,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			UserModelBodyValidator,
		},
	},
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:       "Read user unauthorized",
		method:    "GET",
		endpoint:  "/api/users/2",
		body:      "",
		expStatus: http.StatusForbidden,
		expBody:   http.StatusText(http.StatusForbidden) + "\n",
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleReadUser(t *testing.T) {
	testUserRequests(t, readUserTests, true)
}

var readUserClustersTests = []*userTest{
	&userTest{
		initializers: []func(tester *tester){
			initUserWithClusters,
		},
		msg:       "Read user successful",
		method:    "GET",
		endpoint:  "/api/users/1/clusters",
		body:      "",
		expStatus: http.StatusOK,
		useCookie: true,
		expBody:   `[{"name":"cluster-test","server":"https://localhost","context":"context-test","user":"test-admin"}]`,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			ClusterBodyValidator,
		},
	},
}

func TestHandleReadUserClusters(t *testing.T) {
	testUserRequests(t, readUserClustersTests, true)
}

var readUserClustersAllTests = []*userTest{
	&userTest{
		initializers: []func(tester *tester){
			initUserWithClusters,
		},
		msg:       "Read user successful",
		method:    "GET",
		endpoint:  "/api/users/1/clusters/all",
		body:      "",
		expStatus: http.StatusOK,
		useCookie: true,
		expBody:   `[{"name":"cluster-test","server":"https://localhost","context":"context-test","user":"test-admin"}]`,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			ClusterBodyValidator,
		},
	},
	&userTest{
		initializers: []func(tester *tester){
			initUserWithClusters,
			func(tester *tester) {
				initUserDefault(tester)

				user, _ := tester.repo.User.ReadUserByEmail("belanger@getporter.dev")
				user.Clusters = []models.ClusterConfig{}
				user.RawKubeConfig = []byte("apiVersion: \xc5\n")

				tester.repo.User.UpdateUser(user)

			},
		},
		msg:       "Read user with invalid utf-8 \xc5 in kubeconfig",
		method:    "GET",
		endpoint:  "/api/users/1/clusters/all",
		body:      "",
		expStatus: http.StatusBadRequest,
		useCookie: true,
		expBody:   `{"code":600,"errors":["could not process request"]}`,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			ClusterBodyValidator,
		},
	},
}

func TestHandleReadUserClustersAll(t *testing.T) {
	testUserRequests(t, readUserClustersAllTests, true)
}

var updateUserTests = []*userTest{
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:       "Update user successful",
		method:    "PUT",
		endpoint:  "/api/users/1",
		body:      `{"rawKubeConfig":"apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin", "allowedClusters":[]}`,
		expStatus: http.StatusNoContent,
		expBody:   "",
		useCookie: true,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			func(c *userTest, tester *tester, t *testing.T) {
				req, err := http.NewRequest(
					"GET",
					"/api/users/1",
					strings.NewReader(""),
				)

				req.AddCookie(tester.cookie)

				if err != nil {
					t.Fatal(err)
				}

				rr2 := httptest.NewRecorder()
				tester.router.ServeHTTP(rr2, req)

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
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:       "Update user invalid id",
		method:    "PUT",
		endpoint:  "/api/users/alsdfjk",
		body:      `{"rawKubeConfig":"apiVersion: v1\nkind: Config\npreferences: {}\ncurrent-context: default\nclusters:\n- cluster:\n    server: https://localhost\n  name: cluster-test\ncontexts:\n- context:\n    cluster: cluster-test\n    user: test-admin\n  name: context-test\nusers:\n- name: test-admin", "allowedClusters":[]}`,
		expStatus: http.StatusForbidden,
		expBody:   http.StatusText(http.StatusForbidden) + "\n",
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:       "Update user bad kubeconfig",
		method:    "PUT",
		endpoint:  "/api/users/1",
		body:      `{"rawKubeConfig":"notvalidyaml", "allowedClusters":[]}`,
		expStatus: http.StatusBadRequest,
		expBody:   `{"code":600,"errors":["could not process request"]}`,
		useCookie: true,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleUpdateUser(t *testing.T) {
	testUserRequests(t, updateUserTests, true)
}

var deleteUserTests = []*userTest{
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:       "Delete user successful",
		method:    "DELETE",
		endpoint:  "/api/users/1",
		body:      `{"password":"hello"}`,
		expStatus: http.StatusNoContent,
		expBody:   "",
		useCookie: true,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			func(c *userTest, tester *tester, t *testing.T) {
				req, err := http.NewRequest(
					"GET",
					"/api/users/1",
					strings.NewReader(""),
				)

				req.AddCookie(tester.cookie)

				if err != nil {
					t.Fatal(err)
				}

				rr2 := httptest.NewRecorder()

				tester.router.ServeHTTP(rr2, req)

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
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:       "Delete user invalid id",
		method:    "DELETE",
		endpoint:  "/api/users/aldkjf",
		body:      `{"password":"hello"}`,
		expStatus: http.StatusForbidden,
		expBody:   http.StatusText(http.StatusForbidden) + "\n",
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
	&userTest{
		initializers: []func(tester *tester){
			initUserDefault,
		},
		msg:       "Delete user missing password",
		method:    "DELETE",
		endpoint:  "/api/users/1",
		body:      `{}`,
		expStatus: http.StatusUnprocessableEntity,
		expBody:   `{"code":601,"errors":["required validation failed"]}`,
		useCookie: true,
		validators: []func(c *userTest, tester *tester, t *testing.T){
			BasicBodyValidator,
		},
	},
}

func TestHandleDeleteUser(t *testing.T) {
	testUserRequests(t, deleteUserTests, true)
}

func BasicBodyValidator(c *userTest, tester *tester, t *testing.T) {
	if body := tester.rr.Body.String(); body != c.expBody {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, body, c.expBody)
	}
}

func UserModelBodyValidator(c *userTest, tester *tester, t *testing.T) {
	gotBody := &models.UserExternal{}
	expBody := &models.UserExternal{}

	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}

func ClusterBodyValidator(c *userTest, tester *tester, t *testing.T) {
	// if status is expected to be 200, parse the body for UserExternal
	gotBody := &[]models.ClusterConfigExternal{}
	expBody := &[]models.ClusterConfigExternal{}

	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
	json.Unmarshal([]byte(c.expBody), expBody)

	if !reflect.DeepEqual(gotBody, expBody) {
		t.Errorf("%s, handler returned wrong body: got %v want %v",
			c.msg, gotBody, expBody)
	}
}
