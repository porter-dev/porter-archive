package pack

import (
	"context"
	"fmt"
	"net/url"
	"path/filepath"
	"strings"

	"github.com/buildpacks/pack"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/cli/cmd/docker"
	"github.com/porter-dev/porter/cli/cmd/github"
	"k8s.io/client-go/util/homedir"
)

type Agent struct{}

func (a *Agent) Build(opts *docker.BuildOpts, buildConfig *types.BuildConfig) error {
	//create a context object
	context := context.Background()

	//initialize a pack client
	client, err := pack.NewClient(pack.WithLogger(newPackLogger()))

	if err != nil {
		return err
	}

	absPath, err := filepath.Abs(opts.BuildContext)

	if err != nil {
		return err
	}

	buildOpts := pack.BuildOptions{
		RelativeBaseDir: filepath.Dir(absPath),
		Image:           fmt.Sprintf("%s:%s", opts.ImageRepo, opts.Tag),
		Builder:         "paketobuildpacks/builder:full",
		AppPath:         opts.BuildContext,
		TrustBuilder:    true,
		Env:             opts.Env,
	}

	if buildConfig != nil {
		buildOpts.Builder = buildConfig.Builder
		for i := range buildConfig.Buildpacks {
			bp := buildConfig.Buildpacks[i]
			u, err := url.Parse(bp)
			if err == nil {
				// could be a git repository containing the buildpack
				dstDir := filepath.Join(homedir.HomeDir(), ".porter")
				bpCustomName := strings.ReplaceAll(u.Path, "/", "-")
				downloader := &github.ZIPDownloader{
					ZipFolderDest:       dstDir,
					AssetFolderDest:     dstDir,
					ZipName:             fmt.Sprintf("%s.zip", bpCustomName),
					RemoveAfterDownload: true,
				}

				err = downloader.DownloadToFile(bp)
				if err != nil {
					return err
				}

				err = downloader.UnzipToDir()
				if err != nil {
					return err
				}

				buildOpts.Buildpacks = append(buildOpts.Buildpacks, bpCustomName)
			} else {
				buildOpts.Buildpacks = append(buildOpts.Buildpacks, bp)
			}
		}
		// FIXME: use all the config vars
	}

	if strings.HasPrefix(buildOpts.Builder, "heroku") {
		buildOpts.Buildpacks = append(buildOpts.Buildpacks, "heroku/procfile")
	}

	return client.Build(context, buildOpts)
}
