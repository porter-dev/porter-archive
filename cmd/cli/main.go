package main

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
)

func handleDockerClientErr(err error, cli *client.Client) {
	if strings.Contains(err.Error(), "Cannot connect to the Docker daemon") {
		fmt.Printf("The Docker daemon must be running in order to start Porter: connection to %s failed.\n", cli.DaemonHost())
		return
	}

	fmt.Println(err.Error())
	return
}

func main() {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())

	if err != nil {
		panic(err)
	}

	containers, err := cli.ContainerList(ctx, types.ContainerListOptions{})
	if err != nil {
		handleDockerClientErr(err, cli)
		return
	}

	for _, container := range containers {
		fmt.Printf("%s %s\n", container.ID[:10], container.Image)
	}

	// images, err := cli.ImageList(ctx, types.ImageListOptions{})
	// if err != nil {
	// 	panic(err)
	// }

	// for _, image := range images {
	// 	fmt.Println(image.ID)
	// }
}
