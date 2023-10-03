package pack

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	packclient "github.com/buildpacks/pack/pkg/client"
	githubApi "github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/cli/cmd/github"
	"k8s.io/client-go/util/homedir"
)

var sharedPackClient *packclient.Client

func init() {
	var err error
	// initialize a pack client
	logger := newPackLogger()

	sharedPackClient, err = packclient.NewClient(packclient.WithLogger(logger))

	if err != nil {
		panic(err)
	}
}

// Agent is a buildpack agent
type Agent struct{}

// Build manages buildpack builds
func (a *Agent) Build(ctx context.Context, opts *docker.BuildOpts, buildConfig *types.BuildConfig, cacheImage string) error {
	absPath, err := filepath.Abs(opts.BuildContext)
	if err != nil {
		return err
	}

	mode := os.FileMode(0o600)
	procfilePath := filepath.Clean(filepath.Join(absPath, "Procfile"))
	file, err := os.OpenFile(procfilePath, os.O_RDONLY|os.O_CREATE, mode)
	if err != nil {
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}

	buildOpts := packclient.BuildOptions{
		RelativeBaseDir: filepath.Dir(absPath),
		Image:           fmt.Sprintf("%s:%s", opts.ImageRepo, opts.Tag),
		Builder:         "paketobuildpacks/builder:full",
		AppPath:         opts.BuildContext,
		Env:             opts.Env,
		GroupID:         0,
	}

	if opts.UseCache {
		buildOpts.CacheImage = cacheImage
		buildOpts.Publish = true
	}

	if buildConfig != nil {
		buildOpts.Builder = buildConfig.Builder
		for i := range buildConfig.Buildpacks {
			bp := buildConfig.Buildpacks[i]
			if bp == "" {
				continue
			}

			bpRealName, err := getBuildpackName(ctx, bp)
			if err != nil {
				return err
			}

			buildOpts.Buildpacks = append(buildOpts.Buildpacks, bpRealName)
		}
		// FIXME: use all the config vars
	}

	if len(buildOpts.Buildpacks) > 0 && strings.HasPrefix(buildOpts.Builder, "heroku") {
		buildOpts.Buildpacks = append(buildOpts.Buildpacks, "heroku/procfile@2.0.1")
	}

	return sharedPackClient.Build(ctx, buildOpts)
}

func getBuildpackName(ctx context.Context, bp string) (string, error) {
	if bp == "" {
		return "", errors.New("please specify a buildpack name")
	}

	u, err := url.Parse(bp)
	if err != nil {
		return bp, nil
	}

	// if there is no scheme, it's likely something like `heroku/nodejs`
	// if the scheme is `urn`, it's like something like `urn:cnb:registry:heroku/nodejs`
	if u.Scheme == "" || u.Scheme == "urn" {
		return bp, nil
	}

	// pass cnb-shimmed buildpacks as is
	if u.Host == "cnb-shim.herokuapp.com" {
		return bp, nil
	}

	var bpRealName string
	// could be a git repository containing the buildpack
	if !strings.HasSuffix(u.Path, ".zip") && u.Host != "github.com" && u.Host != "www.github.com" {
		return bpRealName, errors.New("please provide either a github.com URL or a ZIP file URL")
	}

	urlPaths := strings.Split(u.Path[1:], "/")
	dstDir := filepath.Join(homedir.HomeDir(), ".porter")
	bpCustomName := regexp.MustCompile("/|-").ReplaceAllString(u.Path[1:], "_")

	var zipFileName string
	if strings.HasSuffix(bpCustomName, ".zip") {
		zipFileName = bpCustomName
	} else {
		zipFileName = fmt.Sprintf("%s.zip", bpCustomName)
	}
	downloader := &github.ZIPDownloader{
		ZipFolderDest:       dstDir,
		AssetFolderDest:     dstDir,
		ZipName:             zipFileName,
		RemoveAfterDownload: true,
	}

	if zipFileName != bpCustomName {
		// try to download the repo ZIP from github
		githubClient := githubApi.NewClient(nil)
		rel, _, err := githubClient.Repositories.GetLatestRelease(
			ctx,
			urlPaths[0],
			urlPaths[1],
		)
		if err == nil {
			bp = rel.GetZipballURL()
		} else {
			// default to the current default branch
			repo, _, err := githubClient.Repositories.Get(
				ctx,
				urlPaths[0],
				urlPaths[1],
			)
			if err != nil {
				return bpRealName, errors.New("could not fetch git repo details")
			}
			bp = fmt.Sprintf("%s/archive/refs/heads/%s.zip", bp, repo.GetDefaultBranch())
		}
	}

	if err := downloader.DownloadToFile(bp); err != nil {
		return bpRealName, fmt.Errorf("failed to download buildpack: %w", err)
	}

	if err := downloader.UnzipToDir(); err != nil {
		return bpRealName, fmt.Errorf("failed to extract buildpack: %w", err)
	}

	dstFiles, err := os.ReadDir(dstDir)
	if err != nil {
		return bpRealName, fmt.Errorf("failed to list files in extracted buildpack: %w", err)
	}

	for _, info := range dstFiles {
		if info.Type().IsDir() && strings.Contains(info.Name(), urlPaths[1]) {
			bpRealName = filepath.Join(dstDir, info.Name())
		}
	}

	return bpRealName, nil
}
