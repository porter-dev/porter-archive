package api_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/porter-dev/porter/internal/config"
	"github.com/porter-dev/porter/internal/repository/test"
	"github.com/porter-dev/porter/server/api"

	lr "github.com/porter-dev/porter/internal/logger"
	vr "github.com/porter-dev/porter/internal/validator"
)

func initApi() *api.App {
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

	repo := test.NewRepository(true)

	return api.New(logger, repo, validator)
}

func TestHandleCreateUser(t *testing.T) {
	// create a mock API
	api := initApi()

	req, err := http.NewRequest("POST", "/api/users", strings.NewReader("{\"email\":\"belanger@getporter.dev\",\"password\":\"hello\"}"))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(api.HandleCreateUser)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusCreated)
	}
}
