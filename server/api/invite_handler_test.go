package api_test

// import (
// 	"encoding/json"
// 	"net/http"
// 	"strings"
// 	"testing"
// 	"time"

// 	"github.com/go-test/deep"
// 	"github.com/porter-dev/porter/internal/models"
// )

// // ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

// type inviteTest struct {
// 	initializers []func(t *tester)
// 	msg          string
// 	method       string
// 	endpoint     string
// 	body         string
// 	expStatus    int
// 	expBody      string
// 	useCookie    bool
// 	validators   []func(c *inviteTest, tester *tester, t *testing.T)
// }

// func testInviteRequests(t *testing.T, tests []*inviteTest, canQuery bool) {
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

// var createInviteTests = []*inviteTest{
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initProject,
// 		},
// 		msg:       "Create invite",
// 		method:    "POST",
// 		endpoint:  "/api/projects/1/invites",
// 		body:      `{"email":"test@test.it"}`,
// 		expStatus: http.StatusCreated,
// 		expBody:   `{"id":1,"expired":false,"email":"test@test.it","accepted":false}`,
// 		useCookie: true,
// 		validators: []func(c *inviteTest, tester *tester, t *testing.T){
// 			func(c *inviteTest, tester *tester, t *testing.T) {
// 				// manually read the invite to get the expected token
// 				invite, _ := tester.repo.Invite().ReadInvite(1)

// 				gotBody := &models.InviteExternal{}
// 				expBody := &models.InviteExternal{
// 					Token: invite.Token,
// 				}

// 				json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
// 				json.Unmarshal([]byte(c.expBody), &expBody)

// 				if diff := deep.Equal(gotBody, expBody); diff != nil {
// 					t.Errorf("handler returned wrong body:\n")
// 					t.Error(diff)
// 				}
// 			},
// 		},
// 	},
// }

// func TestHandleCreateInvite(t *testing.T) {
// 	testInviteRequests(t, createInviteTests, true)
// }

// var listInvitesTest = []*inviteTest{
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initProject,
// 			initInvite,
// 		},
// 		msg:       "List invites",
// 		method:    "GET",
// 		endpoint:  "/api/projects/1/invites",
// 		body:      ``,
// 		expStatus: http.StatusOK,
// 		expBody:   `[{"id":1,"expired":false,"email":"test@test.it","accepted":false}]`,
// 		useCookie: true,
// 		validators: []func(c *inviteTest, tester *tester, t *testing.T){
// 			func(c *inviteTest, tester *tester, t *testing.T) {
// 				// manually read the invite to get the expected token
// 				invite, _ := tester.repo.Invite().ReadInvite(1)

// 				gotBody := []*models.InviteExternal{}
// 				expBody := []*models.InviteExternal{}

// 				json.Unmarshal(tester.rr.Body.Bytes(), &gotBody)
// 				json.Unmarshal([]byte(c.expBody), &expBody)

// 				expBody[0].Token = invite.Token

// 				if diff := deep.Equal(gotBody, expBody); diff != nil {
// 					t.Errorf("handler returned wrong body:\n")
// 					t.Error(diff)
// 				}
// 			},
// 		},
// 	},
// }

// func TestHandleListInvites(t *testing.T) {
// 	testInviteRequests(t, listInvitesTest, true)
// }

// var acceptInviteTests = []*inviteTest{
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initUserAlt,
// 			initProject,
// 			initInvite,
// 		},
// 		msg:       "Accept invite",
// 		method:    "GET",
// 		endpoint:  "/api/projects/1/invites/abcd",
// 		body:      ``,
// 		expStatus: http.StatusFound,
// 		expBody:   ``,
// 		useCookie: true,
// 		validators: []func(c *inviteTest, tester *tester, t *testing.T){
// 			func(c *inviteTest, tester *tester, t *testing.T) {
// 				user, err := tester.repo.User().ReadUserByEmail("test@test.it")

// 				if err != nil {
// 					t.Fatalf("%v\n", err)
// 				}

// 				projects, err := tester.repo.Project().ListProjectsByUserID(user.ID)

// 				if len(projects) != 1 {
// 					t.Fatalf("length of projects not 1\n")
// 				}

// 				if projects[0].ID != 1 {
// 					t.Fatalf("project id was not 1\n")
// 				}

// 				if projects[0].Name != "project-test" {
// 					t.Fatalf("project was not project-test\n")
// 				}
// 			},
// 		},
// 	},
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initUserAlt,
// 			initProject,
// 			initInvite,
// 		},
// 		msg:       "Accept invite wrong token",
// 		method:    "GET",
// 		endpoint:  "/api/projects/1/invites/abcd1",
// 		body:      ``,
// 		expStatus: http.StatusFound,
// 		expBody:   ``,
// 		useCookie: true,
// 		validators: []func(c *inviteTest, tester *tester, t *testing.T){
// 			func(c *inviteTest, tester *tester, t *testing.T) {
// 				expRes := "/dashboard?error=Invalid+invite+token"

// 				if expRes != tester.rr.HeaderMap.Get("Location") {
// 					t.Fatalf("Redirect location not correct: expected %v, got %v\n", expRes, tester.rr.HeaderMap.Get("Location"))
// 				}
// 			},
// 		},
// 	},
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initProject,
// 			initInvite,
// 		},
// 		msg:       "Accept invite wrong user",
// 		method:    "GET",
// 		endpoint:  "/api/projects/1/invites/abcd",
// 		body:      ``,
// 		expStatus: http.StatusFound,
// 		expBody:   ``,
// 		useCookie: true,
// 		validators: []func(c *inviteTest, tester *tester, t *testing.T){
// 			func(c *inviteTest, tester *tester, t *testing.T) {
// 				expRes := "/dashboard?error=Wrong+email+for+invite"

// 				if expRes != tester.rr.HeaderMap.Get("Location") {
// 					t.Fatalf("Redirect location not correct: expected %v, got %v\n", expRes, tester.rr.HeaderMap.Get("Location"))
// 				}
// 			},
// 		},
// 	},
// 	{
// 		initializers: []func(t *tester){
// 			initUserDefault,
// 			initUserAlt,
// 			initProject,
// 			initInviteExpiredToken,
// 		},
// 		msg:       "Accept invite expired token",
// 		method:    "GET",
// 		endpoint:  "/api/projects/1/invites/abcd",
// 		body:      ``,
// 		expStatus: http.StatusFound,
// 		expBody:   ``,
// 		useCookie: true,
// 		validators: []func(c *inviteTest, tester *tester, t *testing.T){
// 			func(c *inviteTest, tester *tester, t *testing.T) {
// 				expRes := "/dashboard?error=Invite+has+expired"

// 				if expRes != tester.rr.HeaderMap.Get("Location") {
// 					t.Fatalf("Redirect location not correct: expected %v, got %v\n", expRes, tester.rr.HeaderMap.Get("Location"))
// 				}
// 			},
// 		},
// 	},
// }

// func TestHandleAcceptInvite(t *testing.T) {
// 	testInviteRequests(t, acceptInviteTests, true)
// }

// // ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

// func initInvite(tester *tester) {
// 	proj, _ := tester.repo.Project().ReadProject(1)

// 	expiry := time.Now().Add(24 * time.Hour)

// 	invite := &models.Invite{
// 		Token:     "abcd",
// 		Expiry:    &expiry,
// 		Email:     "test@test.it",
// 		ProjectID: proj.Model.ID,
// 	}

// 	tester.repo.Invite().CreateInvite(invite)
// }

// func initInviteExpiredToken(tester *tester) {
// 	proj, _ := tester.repo.Project().ReadProject(1)

// 	expiry := time.Now().Add(-1 * time.Hour)

// 	invite := &models.Invite{
// 		Token:     "abcd",
// 		Expiry:    &expiry,
// 		Email:     "belanger@getporter.dev",
// 		ProjectID: proj.Model.ID,
// 	}

// 	tester.repo.Invite().CreateInvite(invite)
// }
