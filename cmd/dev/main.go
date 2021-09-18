package main

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/router"
	"github.com/porter-dev/porter/api/server/shared/apitest"
)

func main() {
	walkFunc := func(method string, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
		route = strings.Replace(route, "/*/", "/", -1)
		fmt.Printf("%s %s %d\n", method, route, len(middlewares))
		return nil
	}

	configLoader := apitest.NewTestConfigLoader(true)

	config, err := configLoader.LoadConfig()

	if err != nil {
		fmt.Printf("Logging err: %s\n", err.Error())
		return
	}

	r := router.NewAPIRouter(config)

	if err := chi.Walk(r, walkFunc); err != nil {
		fmt.Printf("Logging err: %s\n", err.Error())
		return
	}
}
