package api_test

// import (
// 	"encoding/json"
// 	"fmt"
// 	"net/http"
// 	"net/http/httptest"
// 	"reflect"
// 	"strings"
// 	"testing"

// 	"github.com/go-test/deep"
// 	"github.com/porter-dev/porter/api/types"
// 	"github.com/porter-dev/porter/internal/auth/token"
// 	"github.com/porter-dev/porter/internal/models"
// )

// // ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

// type userTest struct {
// 	initializers []func(t *tester)
// 	msg          string
// 	method       string
// 	endpoint     string
// 	body         string
// 	expStatus    int
// 	expBody      string
// 	useCookie    bool
// 	validators   []func(c *userTest, tester *tester, t *testing.T)
// }

// func testUserRequests(t *testing.T, tests []*userTest, canQuery bool) {
// 	for _, c := range tests {
// 		// create a new tester
// 		tester := newTester(canQuery)

// 		// if there's an initializer, call it
// 		for _, init := range c.initializers {
// 			init(tester)
// 		}

// 		req, err := http.NewRequest(
// 			c.method,
// 			c.endpoint,
// 			strings.NewReader(c.body),
// 		)

// 		tester.req = req

// 		if c.useCookie {
// 			req.AddCookie(tester.cookie)
// 		}

// 		if err != nil {
// 			t.Fatal(err)
// 		}

// 		tester.execute()
// 		rr := tester.rr

// 		// first, check that the status matches
// 		if status := rr.Code; status != c.expStatus {
// 			t.Errorf("%s, handler returned wrong status code: got %v want %v",
// 				c.msg, status, c.expStatus)
// 		}

// 		// if there's a validator, call it
// 		for _, validate := range c.validators {
// 			validate(c, tester, t)
// 		}
// 	}
// }

// // ------------------------- TEST FIXTURES AND FUNCTIONS  ------------------------- //

// var authCheckTests = []*userTest{
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:       "Auth check successful. User is logged in.",
// 		method:    "GET",
// 		endpoint:  "/api/auth/check",
// 		expStatus: http.StatusOK,
// 		body:      "",
// 		expBody:   `{"id":1,"email":"belanger@getporter.dev","email_verified":false}`,
// 		useCookie: true,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:       "Auth check failure. User is not logged in.",
// 		method:    "GET",
// 		endpoint:  "/api/auth/check",
// 		body:      "",
// 		expStatus: http.StatusForbidden,
// 		expBody:   http.StatusText(http.StatusForbidden) + "\n",
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// }

// func TestHandleAuthCheck(t *testing.T) {
// 	testUserRequests(t, authCheckTests, true)
// }

// func TestHandleAuthCheckToken(t *testing.T) {
// 	tester := newTester(true)

// 	initUserDefault(tester)
// 	initProject(tester)

// 	// generate a new token
// 	tokGen, _ := token.GetTokenForAPI(1, 1)

// 	tok, _ := tokGen.EncodeToken(&token.TokenGeneratorConf{
// 		TokenSecret: "secret",
// 	})

// 	req, err := http.NewRequest(
// 		"GET",
// 		"/api/auth/check",
// 		strings.NewReader(""),
// 	)

// 	tester.req = req
// 	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tok))
// 	tester.execute()

// 	rr := tester.rr

// 	if err != nil {
// 		t.Fatal(err)
// 	}

// 	// first, check that the status matches
// 	if status := rr.Code; status != 200 {
// 		t.Errorf("%s, handler returned wrong status code: got %v want %v",
// 			"auth check token", status, 200)
// 	}

// 	gotBody := &models.UserExternal{}
// 	expBody := &models.UserExternal{}

// 	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
// 	json.Unmarshal([]byte(`{"id":1,"email":"belanger@getporter.dev"}`), expBody)

// 	if !reflect.DeepEqual(gotBody, expBody) {
// 		t.Errorf("%s, handler returned wrong body: got %v want %v",
// 			"auth check token", gotBody, expBody)
// 	}
// }

// var createUserTests = []*userTest{
// 	{
// 		msg:      "Create user",
// 		method:   "POST",
// 		endpoint: "/api/users",
// 		body: `{
// 			"email": "belanger@getporter.dev",
// 			"password": "hello"
// 		}`,
// 		expStatus: http.StatusCreated,
// 		expBody:   `{"id":1,"email":"belanger@getporter.dev"}`,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userModelBodyValidator,
// 		},
// 	},
// 	{
// 		msg:      "Create user invalid email",
// 		method:   "POST",
// 		endpoint: "/api/users",
// 		body: `{
// 			"email": "notanemail",
// 			"password": "hello"
// 		}`,
// 		expStatus: http.StatusUnprocessableEntity,
// 		expBody:   `{"code":601,"errors":["email validation failed"]}`,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// 	{
// 		msg:      "Create user missing field",
// 		method:   "POST",
// 		endpoint: "/api/users",
// 		body: `{
// 			"password": "hello"
// 		}`,
// 		expStatus: http.StatusUnprocessableEntity,
// 		expBody:   `{"code":601,"errors":["required validation failed"]}`,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:      "Create user same email",
// 		method:   "POST",
// 		endpoint: "/api/users",
// 		body: `{
// 			"email": "belanger@getporter.dev",
// 			"password": "hello"
// 		}`,
// 		expStatus: http.StatusUnprocessableEntity,
// 		expBody:   `{"code":601,"errors":["email already taken"]}`,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// 	{
// 		msg:      "Create user invalid field type",
// 		method:   "POST",
// 		endpoint: "/api/users",
// 		body: `{
// 			"email": "belanger@getporter.dev",
// 			"password": 0
// 		}`,
// 		expStatus: http.StatusBadRequest,
// 		expBody:   `{"code":600,"errors":["could not process request"]}`,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// }

// func TestHandleCreateUser(t *testing.T) {
// 	testUserRequests(t, createUserTests, true)
// }

// var createUserTestsWriteFail = []*userTest{
// 	{
// 		msg:      "Create user db connection down",
// 		method:   "POST",
// 		endpoint: "/api/users",
// 		body: `{
// 		"email": "belanger@getporter.dev",
// 		"password": "hello"
// 	}`,
// 		expStatus: http.StatusInternalServerError,
// 		expBody:   `{"code":500,"errors":["could not read from database"]}`,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// }

// func TestHandleCreateUserWriteFail(t *testing.T) {
// 	testUserRequests(t, createUserTestsWriteFail, false)
// }

// var loginUserTests = []*userTest{
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:      "Login user successful",
// 		method:   "POST",
// 		endpoint: "/api/login",
// 		body: `{
// 			"email": "belanger@getporter.dev",
// 			"password": "hello"
// 		}`,
// 		expStatus: http.StatusOK,
// 		expBody:   `{"id":1,"email":"belanger@getporter.dev","email_verified":false}`,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:      "Login user already logged in",
// 		method:   "POST",
// 		endpoint: "/api/login",
// 		body: `{
// 			"email": "belanger@getporter.dev",
// 			"password": "hello"
// 		}`,
// 		expStatus: http.StatusOK,
// 		expBody:   `{"id":1,"email":"belanger@getporter.dev","email_verified":false}`,
// 		useCookie: true,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// 	{
// 		msg:      "Login user unregistered email",
// 		method:   "POST",
// 		endpoint: "/api/login",
// 		body: `{
// 			"email": "belanger@getporter.dev",
// 			"password": "hello"
// 		}`,
// 		expStatus: http.StatusUnauthorized,
// 		expBody:   `{"code":401,"errors":["email not registered"]}`,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:      "Login user incorrect password",
// 		method:   "POST",
// 		endpoint: "/api/login",
// 		body: `{
// 			"email": "belanger@getporter.dev",
// 			"password": "notthepassword"
// 		}`,
// 		expStatus: http.StatusUnauthorized,
// 		expBody:   `{"code":401,"errors":["incorrect password"]}`,
// 		useCookie: true,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// }

// func TestHandleLoginUser(t *testing.T) {
// 	testUserRequests(t, loginUserTests, true)
// }

// var logoutUserTests = []*userTest{
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:      "Logout user successful",
// 		method:   "POST",
// 		endpoint: "/api/logout",
// 		body: `{
// 			"email": "belanger@getporter.dev",
// 			"password": "hello"
// 		}`,
// 		expStatus: http.StatusOK,
// 		expBody:   ``,
// 		useCookie: true,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			func(c *userTest, tester *tester, t *testing.T) {
// 				req, err := http.NewRequest(
// 					"GET",
// 					"/api/users/1",
// 					strings.NewReader(""),
// 				)

// 				req.AddCookie(tester.cookie)

// 				if err != nil {
// 					t.Fatal(err)
// 				}

// 				rr2 := httptest.NewRecorder()
// 				tester.router.ServeHTTP(rr2, req)

// 				if status := rr2.Code; status != http.StatusForbidden {
// 					t.Errorf("%s, handler returned wrong status: got %v want %v",
// 						"validator failed", status, http.StatusForbidden)
// 				}
// 			},
// 		},
// 	},
// }

// func TestHandleLogoutUser(t *testing.T) {
// 	testUserRequests(t, logoutUserTests, true)
// }

// var readUserTests = []*userTest{
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:       "Read user successful",
// 		method:    "GET",
// 		endpoint:  "/api/users/1",
// 		body:      "",
// 		expStatus: http.StatusOK,
// 		expBody:   `{"id":1,"email":"belanger@getporter.dev"}`,
// 		useCookie: true,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userModelBodyValidator,
// 		},
// 	},
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:       "Read user unauthorized",
// 		method:    "GET",
// 		endpoint:  "/api/users/2",
// 		body:      "",
// 		expStatus: http.StatusForbidden,
// 		expBody:   http.StatusText(http.StatusForbidden) + "\n",
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// }

// func TestHandleReadUser(t *testing.T) {
// 	testUserRequests(t, readUserTests, true)
// }

// var listUserProjectsTests = []*userTest{
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 			initProject,
// 		},
// 		msg:       "List user projects successful",
// 		method:    "GET",
// 		endpoint:  "/api/users/1/projects",
// 		body:      "",
// 		expStatus: http.StatusOK,
// 		expBody:   `[{"id":1,"name":"project-test","roles":[{"id":0,"kind":"admin","user_id":1,"project_id":1}]}]`,
// 		useCookie: true,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userProjectsListValidator,
// 		},
// 	},
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:       "List user projects unauthorized",
// 		method:    "GET",
// 		endpoint:  "/api/users/2/projects",
// 		body:      "",
// 		expStatus: http.StatusForbidden,
// 		expBody:   http.StatusText(http.StatusForbidden) + "\n",
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// }

// func TestHandleListUserProjects(t *testing.T) {
// 	testUserRequests(t, listUserProjectsTests, true)
// }

// var deleteUserTests = []*userTest{
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:       "Delete user successful",
// 		method:    "DELETE",
// 		endpoint:  "/api/users/1",
// 		body:      `{"password":"hello"}`,
// 		expStatus: http.StatusNoContent,
// 		expBody:   "",
// 		useCookie: true,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			func(c *userTest, tester *tester, t *testing.T) {
// 				req, err := http.NewRequest(
// 					"GET",
// 					"/api/users/1",
// 					strings.NewReader(""),
// 				)

// 				req.AddCookie(tester.cookie)

// 				if err != nil {
// 					t.Fatal(err)
// 				}

// 				rr2 := httptest.NewRecorder()

// 				tester.router.ServeHTTP(rr2, req)

// 				gotBody := &models.UserExternal{}
// 				expBody := &models.UserExternal{}

// 				if status := rr2.Code; status != 404 {
// 					t.Errorf("DELETE user validation, handler returned wrong status code: got %v want %v",
// 						status, 404)
// 				}

// 				json.Unmarshal(rr2.Body.Bytes(), gotBody)
// 				json.Unmarshal([]byte(`{"code":602,"errors":["could not find requested object"]}`), expBody)

// 				if !reflect.DeepEqual(gotBody, expBody) {
// 					t.Errorf("%s, handler returned wrong body: got %v want %v",
// 						"validator failed", gotBody, expBody)
// 				}
// 			},
// 		},
// 	},
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:       "Delete user invalid id",
// 		method:    "DELETE",
// 		endpoint:  "/api/users/aldkjf",
// 		body:      `{"password":"hello"}`,
// 		expStatus: http.StatusForbidden,
// 		expBody:   http.StatusText(http.StatusForbidden) + "\n",
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// 	{
// 		initializers: []func(tester *tester){
// 			initUserDefault,
// 		},
// 		msg:       "Delete user missing password",
// 		method:    "DELETE",
// 		endpoint:  "/api/users/1",
// 		body:      `{}`,
// 		expStatus: http.StatusUnprocessableEntity,
// 		expBody:   `{"code":601,"errors":["required validation failed"]}`,
// 		useCookie: true,
// 		validators: []func(c *userTest, tester *tester, t *testing.T){
// 			userBasicBodyValidator,
// 		},
// 	},
// }

// func TestHandleDeleteUser(t *testing.T) {
// 	testUserRequests(t, deleteUserTests, true)
// }

// // ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

// func initUserDefault(tester *tester) {
// 	tester.createUserSession("belanger@getporter.dev", "hello")
// }

// func initUserAlt(tester *tester) {
// 	tester.createUserSession("test@test.it", "hello")
// }

// func userBasicBodyValidator(c *userTest, tester *tester, t *testing.T) {
// 	if body := tester.rr.Body.String(); strings.TrimSpace(body) != strings.TrimSpace(c.expBody) {
// 		t.Errorf("%s, handler returned wrong body: got %v want %v",
// 			c.msg, body, c.expBody)
// 	}
// }

// func userModelBodyValidator(c *userTest, tester *tester, t *testing.T) {
// 	gotBody := &models.UserExternal{}
// 	expBody := &models.UserExternal{}

// 	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
// 	json.Unmarshal([]byte(c.expBody), expBody)

// 	if !reflect.DeepEqual(gotBody, expBody) {
// 		t.Errorf("%s, handler returned wrong body: got %v want %v",
// 			c.msg, gotBody, expBody)
// 	}
// }

// func userProjectsListValidator(c *userTest, tester *tester, t *testing.T) {
// 	gotBody := make([]*types.Project, 0)
// 	expBody := make([]*types.Project, 0)

// 	json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
// 	json.Unmarshal([]byte(c.expBody), &expBody)

// 	if diff := deep.Equal(gotBody, expBody); diff != nil {
// 		t.Errorf("handler returned wrong body:\n")
// 		t.Error(diff)
// 	}
// }
