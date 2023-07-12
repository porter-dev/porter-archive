package main

import (
	"context"
	"log"

	"github.com/porter-dev/porter/api/authmanagement"
	"github.com/porter-dev/porter/api/server/shared/config/loader"
)

func main() {
	version := "v0.0.0-dgtown"

	cl := loader.NewEnvLoader(version)

	config, err := cl.LoadConfig()
	if err != nil {
		log.Fatal("Config loading failed: ", err)
	}

	authManagementServer := authmanagement.AuthManagementServer{Port: config.ServerConf.AuthManagementServerPort, Config: config}

	err = authManagementServer.ListenAndServe(context.Background())
	if err != nil {
		log.Fatalf("issue running server: %s", err.Error())
	}
}
