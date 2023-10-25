package docker

import (
	"archive/tar"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
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

// BuildLocal
func (a *Agent) BuildLocal(ctx context.Context, opts *BuildOpts) (err error) {
	println("Running with buildkit config", os.Getenv("DOCKER_BUILDKIT"))
	if os.Getenv("DOCKER_BUILDKIT") == "1" {
		return buildLocalWithBuildkit(ctx, opts)
	}

	dockerfilePath := opts.DockerfilePath

	// attempt to read dockerignore file and paths
	dockerIgnoreBytes, _ := os.ReadFile(".dockerignore")
	var excludes []string

	if len(dockerIgnoreBytes) != 0 {
		excludes, err = dockerignore.ReadAll(bytes.NewBuffer(dockerIgnoreBytes))

		if err != nil {
			return err
		}
	}

	excludes = trimBuildFilesFromExcludes(excludes, dockerfilePath)

	tar, err := archive.TarWithOptions(opts.BuildContext, &archive.TarOptions{
		ExcludePatterns: excludes,
	})
	if err != nil {
		return err
	}

	var writer io.Writer = os.Stderr
	if opts.LogFile != nil {
		writer = io.MultiWriter(os.Stderr, opts.LogFile)
	}

	if !opts.IsDockerfileInCtx {
		dockerfileCtx, err := os.Open(dockerfilePath)
		if err != nil {
			return fmt.Errorf("unable to open Dockerfile: %v", err)
		}

		defer dockerfileCtx.Close()

		// add the dockerfile to the build context
		tar, dockerfilePath, err = AddDockerfileToBuildContext(dockerfileCtx, tar)

		if err != nil {
			return err
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
		return err
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

func buildLocalWithBuildkit(ctx context.Context, opts *BuildOpts) error {
	if _, err := exec.LookPath("docker"); err != nil {
		return fmt.Errorf("unable to find docker binary in PATH for buildkit build: %w", err)
	}

	// prepare Dockerfile if the location isn't inside the build context
	if !opts.IsDockerfileInCtx {
		if err := injectDockerfileIntoBuildContext(opts.BuildContext, opts.DockerfilePath); err != nil {
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
		"build",
		"--platform", "linux/amd64",
		"--tag", fmt.Sprintf("%s:%s", opts.ImageRepo, opts.Tag),
		"--cache-from", fmt.Sprintf("%s:%s", opts.ImageRepo, opts.CurrentTag),
	}
	for key, val := range opts.Env {
		commandArgs = append(commandArgs, "--build-arg", fmt.Sprintf("%s=%s", key, val))
	}

	commandArgs = append(commandArgs, extraDockerArgs...)

	stdoutWriters := []io.Writer{os.Stdout}
	stderrWriters := []io.Writer{os.Stderr}
	if opts.LogFile != nil {
		stdoutWriters = append(stdoutWriters, opts.LogFile)
		stderrWriters = append(stderrWriters, opts.LogFile)
	}

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

	if ctx.Err() == context.Canceled {
		return fmt.Errorf("build command canceled: %w", ctx.Err())
	}

	if err := ctx.Err(); err != nil {
		return fmt.Errorf("error while running build: %w", err)
	}

	if exitCode != 0 {
		return fmt.Errorf("build exited with non-zero exit code %d", exitCode)
	}

	return nil
}

func injectDockerfileIntoBuildContext(buildContext string, dockerfilePath string) error {
	randomName := ".dockerfile." + stringid.GenerateRandomID()[:20]
	data := map[string]func() ([]byte, error){
		randomName: func() ([]byte, error) {
			dockerfileCtx, err := os.Open(dockerfilePath)
			if err != nil {
				return []byte{}, err
			}
			defer dockerfileCtx.Close()
			dockerfileBytes, err := io.ReadAll(dockerfileCtx)
			if err != nil {
				return []byte{}, err
			}

			return dockerfileBytes, nil
		},
		".dockerignore": func() ([]byte, error) {
			dockerignorePath := filepath.Join(buildContext, ".dockerignore")
			if _, err := os.Stat(dockerignorePath); errors.Is(err, os.ErrNotExist) {
				if err := touchFilepath(dockerignorePath); err != nil {
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
			return err
		}

		if err := writeBytesToFilepath(filepath.Join(buildContext, filename), bytes); err != nil {
			return err
		}
	}

	return nil
}

func touchFilepath(filepath string) error {
	mode := os.FileMode(0600)
	file, err := os.OpenFile(filepath, os.O_RDWR|os.O_CREATE|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	defer file.Close()
	return file.Chmod(mode)
}

func writeBytesToFilepath(filepath string, contents []byte) error {
	file, err := os.Create(filepath)
	if err != nil {
		return err
	}

	defer file.Close()
	if _, err := file.Write(contents); err != nil {
		return err
	}

	return nil
}
