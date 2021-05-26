package docker

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/pkg/archive"
)

// BuildLocal
func (a *Agent) BuildLocal(dockerfilePath, tag, buildContext string) error {
	tar, err := archive.TarWithOptions(buildContext, &archive.TarOptions{})

	if err != nil {
		return err
	}

	res, err := a.client.ImageBuild(context.Background(), tar, types.ImageBuildOptions{
		Dockerfile: dockerfilePath,
		Tags:       []string{tag},
		Remove:     true,
	})

	if err != nil {
		return err
	}

	return readBuildLogs(res.Body)
}

// TODO -- do something with these build logs (probably stream to Porter)
type ErrorLine struct {
	Error       string      `json:"error"`
	ErrorDetail ErrorDetail `json:"errorDetail"`
}

type ErrorDetail struct {
	Message string `json:"message"`
}

func readBuildLogs(rd io.ReadCloser) error {
	var lastLine string

	scanner := bufio.NewScanner(rd)

	for scanner.Scan() {
		lastLine = scanner.Text()
		fmt.Println(scanner.Text())
	}

	errLine := &ErrorLine{}

	json.Unmarshal([]byte(lastLine), errLine)

	if errLine.Error != "" {
		return errors.New(errLine.Error)
	}

	if err := scanner.Err(); err != nil {
		return err
	}

	return nil

}
