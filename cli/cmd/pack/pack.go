package pack

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/url"
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

type Agent struct{}

func (a *Agent) Build(opts *docker.BuildOpts, buildConfig *types.BuildConfig, cacheImage string) error {
	absPath, err := filepath.Abs(opts.BuildContext)
	if err != nil {
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
			u, err := url.Parse(bp)
			if err == nil && u.Scheme != "" {
				// could be a git repository containing the buildpack
				if !strings.HasSuffix(u.Path, ".zip") && u.Host != "github.com" && u.Host != "www.github.com" {
					return fmt.Errorf("please provide either a github.com URL or a ZIP file URL")
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
						context.Background(),
						urlPaths[0],
						urlPaths[1],
					)
					if err == nil {
						bp = rel.GetZipballURL()
					} else {
						// default to the current default branch
						repo, _, err := githubClient.Repositories.Get(
							context.Background(),
							urlPaths[0],
							urlPaths[1],
						)
						if err != nil {
							return fmt.Errorf("could not fetch git repo details")
						}
						bp = fmt.Sprintf("%s/archive/refs/heads/%s.zip", bp, repo.GetDefaultBranch())
					}
				}

				err = downloader.DownloadToFile(bp)
				if err != nil {
					return err
				}

				err = downloader.UnzipToDir()
				if err != nil {
					return err
				}

				dstFiles, err := ioutil.ReadDir(dstDir)
				if err != nil {
					return err
				}

				var bpRealName string
				for _, info := range dstFiles {
					if info.Mode().IsDir() && strings.Contains(info.Name(), urlPaths[1]) {
						bpRealName = filepath.Join(dstDir, info.Name())
					}
				}

				buildOpts.Buildpacks = append(buildOpts.Buildpacks, bpRealName)
			} else {
				buildOpts.Buildpacks = append(buildOpts.Buildpacks, bp)
			}
		}
		// FIXME: use all the config vars
	}

	if len(buildOpts.Buildpacks) > 0 && strings.HasPrefix(buildOpts.Builder, "heroku") {
		buildOpts.Buildpacks = append(buildOpts.Buildpacks, "heroku/procfile@1.0.1")
	}

	return sharedPackClient.Build(context.Background(), buildOpts)
}
