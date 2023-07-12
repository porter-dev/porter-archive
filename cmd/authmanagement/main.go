package main

import (
	"context"
	"log"

	"github.com/porter-dev/porter/api/authmanagement"
	"github.com/porter-dev/porter/api/server/shared/config/loader"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cl := loader.NewEnvLoader("")

	config, err := cl.LoadConfig()
	if err != nil {
		log.Fatal("Config loading failed: ", err)
	}

	authManagementServer := authmanagement.AuthManagementServer{Port: config.ServerConf.AuthManagementServerPort, Config: config}

	err = authManagementServer.ListenAndServe(ctx)
	if err != nil {
		log.Fatalf("issue running server: %s", err.Error())
	}
}
