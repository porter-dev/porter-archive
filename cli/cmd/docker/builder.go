package docker

import (
	"archive/tar"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/pkg/archive"
	"github.com/docker/docker/pkg/fileutils"
	"github.com/moby/buildkit/frontend/dockerfile/dockerignore"
	"github.com/moby/moby/pkg/jsonmessage"
	"github.com/moby/moby/pkg/stringid"
	"github.com/moby/term"
	"mvdan.cc/sh/v3/shell"
)

type BuildOpts struct {
	ImageRepo         string
	Tag               string
	CurrentTag        string
	BuildContext      string
	DockerfilePath    string
	IsDockerfileInCtx bool
	UseCache          bool

	Env map[string]string

	LogFile *os.File
}

// BuildLocal builds a Dockerfile using the local Docker daemon
func (a *Agent) BuildLocal(ctx context.Context, opts *BuildOpts) (err error) {
	if opts == nil {
		return errors.New("build opts cannot be nil")
	}
	if opts.UseCache {
		err = a.PullImage(ctx, fmt.Sprintf("%s:%s", opts.ImageRepo, opts.CurrentTag))
		if err != nil {
			log.Printf("unable to pull image. Continuing with build: %s", err.Error())
		}
	}
	if os.Getenv("DOCKER_BUILDKIT") == "1" {
		return buildLocalWithBuildkit(ctx, *opts)
	}

	dockerfilePath := opts.DockerfilePath

	// attempt to read dockerignore file and paths
	dockerIgnoreBytes, _ := os.ReadFile(".dockerignore")
	var excludes []string

	if len(dockerIgnoreBytes) != 0 {
		excludes, err = dockerignore.ReadAll(bytes.NewBuffer(dockerIgnoreBytes))
		if err != nil {
			return fmt.Errorf("error reading .dockerignore: %w", err)
		}
	}

	excludes = trimBuildFilesFromExcludes(excludes, dockerfilePath)

	tar, err := archive.TarWithOptions(opts.BuildContext, &archive.TarOptions{
		ExcludePatterns: excludes,
	})
	if err != nil {
		return fmt.Errorf("error creating tar: %w", err)
	}

	var writer io.Writer = os.Stderr
	if opts.LogFile != nil {
		writer = io.MultiWriter(os.Stderr, opts.LogFile)
	}

	if !opts.IsDockerfileInCtx {
		dockerfileCtx, err := os.Open(dockerfilePath)
		if err != nil {
			return fmt.Errorf("error opening Dockerfile: %w", err)
		}

		defer dockerfileCtx.Close()

		// add the dockerfile to the build context
		tar, dockerfilePath, err = AddDockerfileToBuildContext(dockerfileCtx, tar)
		if err != nil {
			return fmt.Errorf("error adding Dockerfile to build context: %w", err)
		}
	}

	buildArgs := make(map[string]*string)

	for key, val := range opts.Env {
		valCopy := val
		buildArgs[key] = &valCopy
	}

	// attach BUILDKIT_INLINE_CACHE=1 by default, to take advantage of caching
	inlineCacheVal := "1"
	buildArgs["BUILDKIT_INLINE_CACHE"] = &inlineCacheVal

	out, err := a.ImageBuild(ctx, tar, types.ImageBuildOptions{
		Dockerfile: dockerfilePath,
		BuildArgs:  buildArgs,
		Tags: []string{
			fmt.Sprintf("%s:%s", opts.ImageRepo, opts.Tag),
		},
		CacheFrom: []string{
			fmt.Sprintf("%s:%s", opts.ImageRepo, opts.CurrentTag),
		},
		Remove:   true,
		Platform: "linux/amd64",
	})
	if err != nil {
		return fmt.Errorf("error building image: %w", err)
	}

	defer out.Body.Close()

	termFd, isTerm := term.GetFdInfo(os.Stderr)

	return jsonmessage.DisplayJSONMessagesStream(out.Body, writer, termFd, isTerm, nil)
}

func trimBuildFilesFromExcludes(excludes []string, dockerfile string) []string {
	if keep, _ := fileutils.Matches(".dockerignore", excludes); keep {
		excludes = append(excludes, "!.dockerignore")
	}
	if keep, _ := fileutils.Matches(dockerfile, excludes); keep {
		excludes = append(excludes, "!"+dockerfile)
	}
	return excludes
}

// AddDockerfileToBuildContext from a ReadCloser, returns a new archive and
// the relative path to the dockerfile in the context.
func AddDockerfileToBuildContext(dockerfileCtx io.ReadCloser, buildCtx io.ReadCloser) (io.ReadCloser, string, error) {
	file, err := ioutil.ReadAll(dockerfileCtx)
	dockerfileCtx.Close()
	if err != nil {
		return nil, "", err
	}
	now := time.Now()
	hdrTmpl := &tar.Header{
		Mode:       0o600,
		Uid:        0,
		Gid:        0,
		ModTime:    now,
		Typeflag:   tar.TypeReg,
		AccessTime: now,
		ChangeTime: now,
	}
	randomName := ".dockerfile." + stringid.GenerateRandomID()[:20]

	buildCtx = archive.ReplaceFileTarWrapper(buildCtx, map[string]archive.TarModifierFunc{
		// Add the dockerfile with a random filename
		randomName: func(_ string, h *tar.Header, content io.Reader) (*tar.Header, []byte, error) {
			return hdrTmpl, file, nil
		},
		// Update .dockerignore to include the random filename
		".dockerignore": func(_ string, h *tar.Header, content io.Reader) (*tar.Header, []byte, error) {
			if h == nil {
				h = hdrTmpl
			}

			b := &bytes.Buffer{}
			if content != nil {
				if _, err := b.ReadFrom(content); err != nil {
					return nil, nil, err
				}
			} else {
				b.WriteString(".dockerignore")
			}
			b.WriteString("\n" + randomName + "\n")
			return h, b.Bytes(), nil
		},
	})
	return buildCtx, randomName, nil
}

func buildLocalWithBuildkit(ctx context.Context, opts BuildOpts) error {
	if _, err := exec.LookPath("docker"); err != nil {
		return fmt.Errorf("unable to find docker binary in PATH for buildkit build: %w", err)
	}

	// prepare Dockerfile if the location isn't inside the build context
	dockerfileName := opts.DockerfilePath
	if !opts.IsDockerfileInCtx {
		var err error
		dockerfileName, err = injectDockerfileIntoBuildContext(opts.BuildContext, opts.DockerfilePath)
		if err != nil {
			return fmt.Errorf("unable to inject Dockerfile into build context: %w", err)
		}
	}
	// parse any arguments
	var extraDockerArgs []string
	if buildkitArgs := os.Getenv("PORTER_BUILDKIT_ARGS"); buildkitArgs != "" {
		parsedFields, err := shell.Fields(buildkitArgs, func(name string) string {
			return os.Getenv(name)
		})
		if err != nil {
			return fmt.Errorf("error while parsing buildkit args: %w", err)
		}
		extraDockerArgs = parsedFields
	}

	commandArgs := []string{
		"buildx",
		"build",
		"-f", dockerfileName,
		"--tag", fmt.Sprintf("%s:%s", opts.ImageRepo, opts.Tag),
		"--cache-from", fmt.Sprintf("type=registry,ref=%s:%s", opts.ImageRepo, opts.CurrentTag),
	}
	for key, val := range opts.Env {
		if key == "PORTER_BUILDKIT_ARGS" {
			continue
		}
		commandArgs = append(commandArgs, "--build-arg", fmt.Sprintf("%s=%s", key, val))
	}

	if !sliceContainsString(extraDockerArgs, "--platform") {
		commandArgs = append(commandArgs, "--platform", "linux/amd64")
	}

	commandArgs = append(commandArgs, extraDockerArgs...)
	// note: the path _must_ be the last argument
	commandArgs = append(commandArgs, opts.BuildContext)

	stdoutWriters := []io.Writer{os.Stdout}
	stderrWriters := []io.Writer{os.Stderr}
	if opts.LogFile != nil {
		stdoutWriters = append(stdoutWriters, opts.LogFile)
		stderrWriters = append(stderrWriters, opts.LogFile)
	}

	fmt.Println("Running build command: docker", strings.Join(commandArgs, " "))

	// #nosec G204 - The command is meant to be variable
	cmd := exec.CommandContext(ctx, "docker", commandArgs...)
	cmd.Dir = opts.BuildContext
	cmd.Stdout = io.MultiWriter(stdoutWriters...)
	cmd.Stderr = io.MultiWriter(stderrWriters...)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("unable to start the build command: %w", err)
	}

	exitCode := 0
	execErr := cmd.Wait()
	if execErr != nil {
		if exitError, ok := execErr.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		}
	}

	if err := ctx.Err(); err != nil && err == context.Canceled {
		return fmt.Errorf("build command canceled: %w", ctx.Err())
	}

	if err := ctx.Err(); err != nil {
		return fmt.Errorf("error while running build: %w", err)
	}

	if exitCode != 0 {
		return fmt.Errorf("build exited with non-zero exit code %d", exitCode)
	}

	if execErr != nil {
		return fmt.Errorf("error while running build: %w", execErr)
	}

	return nil
}

func injectDockerfileIntoBuildContext(buildContext string, dockerfilePath string) (string, error) {
	randomName := ".dockerfile." + stringid.GenerateRandomID()[:20]
	data := map[string]func() ([]byte, error){
		randomName: func() ([]byte, error) {
			return os.ReadFile(filepath.Clean(dockerfilePath))
		},
		".dockerignore": func() ([]byte, error) {
			dockerignorePath := filepath.Join(buildContext, ".dockerignore")
			dockerignorePath = filepath.Clean(dockerignorePath)
			if _, err := os.Stat(dockerignorePath); errors.Is(err, os.ErrNotExist) {
				if err := os.WriteFile(dockerignorePath, []byte{}, os.FileMode(0o600)); err != nil {
					return []byte{}, err
				}
			}

			data, err := os.ReadFile(dockerignorePath)
			if err != nil {
				return data, err
			}

			b := bytes.NewBuffer(data)
			b.WriteString(".dockerignore")
			b.WriteString("\n" + randomName + "\n")
			return b.Bytes(), nil
		},
	}

	for filename, fn := range data {
		bytes, err := fn()
		if err != nil {
			return randomName, fmt.Errorf("failed to get file contents: %w", err)
		}

		return randomName, os.WriteFile(filepath.Join(buildContext, filename), bytes, os.FileMode(0o600))
	}

	return randomName, nil
}

// sliceContainsString implements slice.Contains and should be removed on upgrade to golang 1.21
func sliceContainsString(haystack []string, needle string) bool {
	for _, value := range haystack {
		if value == needle {
			return true
		}
	}

	return false
}
