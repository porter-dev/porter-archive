package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/porter-dev/porter/internal/config"
)

func main() {
	appConf := config.FromEnv()

	resp, err := http.Get(fmt.Sprintf("http://localhost:%d/api/livez", appConf.Server.Port))

	if err != nil || resp.StatusCode >= http.StatusBadRequest {
		os.Exit(1)
	}

	resp, err = http.Get(fmt.Sprintf("http://localhost:%d/api/readyz", appConf.Server.Port))

	if err != nil || resp.StatusCode >= http.StatusBadRequest {
		os.Exit(1)
	}
}
