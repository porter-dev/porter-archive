package github

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"github.com/google/go-github/github"
)

// ZIPReleaseGetter retrieves a release from Github in ZIP format and downloads it
// to a directory on host
type ZIPReleaseGetter struct {
	// The name of the asset, i.e. "porter", "portersvr", "static"
	AssetName string

	// The host folder destination of the asset
	AssetFolderDest string

	// The host folder destination for the .zip file
	ZipFolderDest string

	// The name of the .zip file to download to
	ZipName string

	// The name of the Github entity whose repo is queried: i.e. "porter-dev"
	EntityID string

	// The name of the Github repo to get releases from
	RepoName string

	// If the asset is platform dependent
	IsPlatformDependent bool

	// The downloader/unzipper
	Downloader *ZIPDownloader
}

// GetLatestRelease downloads the latest .zip release from a given Github repository
func (z *ZIPReleaseGetter) GetLatestRelease() error {
	releaseURL, err := z.getLatestReleaseDownloadURL()

	if err != nil {
		return err
	}

	return z.getReleaseFromURL(releaseURL)
}

// GetRelease downloads a specific .zip release from a given Github repository
func (z *ZIPReleaseGetter) GetRelease(releaseTag string) error {
	releaseURL, err := z.getReleaseDownloadURL(releaseTag)

	fmt.Printf("getting release %s\n", releaseURL)

	if err != nil {
		return err
	}

	return z.getReleaseFromURL(releaseURL)
}

func (z *ZIPReleaseGetter) getReleaseFromURL(releaseURL string) error {
	fmt.Printf("getting release %s\n", releaseURL)

	err := z.Downloader.DownloadToFile(releaseURL)

	fmt.Printf("downloaded release %s to file %s\n", z.AssetName, filepath.Join(z.ZipFolderDest, z.ZipName))

	if err != nil {
		return err
	}

	fmt.Printf("unzipping %s to %s\n", z.AssetName, z.AssetFolderDest)

	err = z.Downloader.UnzipToDir()

	return err
}

// retrieves the download url for the latest release of an asset
func (z *ZIPReleaseGetter) getLatestReleaseDownloadURL() (string, error) {
	client := github.NewClient(nil)

	rel, _, err := client.Repositories.GetLatestRelease(context.Background(), z.EntityID, z.RepoName)

	if err != nil {
		return "", err
	}

	re, err := z.getDownloadRegexp()

	if err != nil {
		return "", err
	}

	releaseURL := ""

	// iterate through the assets
	for _, asset := range rel.Assets {
		if downloadURL := asset.GetBrowserDownloadURL(); re.MatchString(downloadURL) {
			releaseURL = downloadURL
		}
	}

	return releaseURL, nil
}

func (z *ZIPReleaseGetter) getReleaseDownloadURL(releaseTag string) (string, error) {
	client := github.NewClient(nil)

	rel, _, err := client.Repositories.GetReleaseByTag(context.Background(), z.EntityID, z.RepoName, releaseTag)

	if err != nil {
		return "", fmt.Errorf("release %s does not exist", releaseTag)
	}

	re, err := z.getDownloadRegexp()

	if err != nil {
		return "", err
	}

	releaseURL := ""

	// iterate through the assets
	for _, asset := range rel.Assets {
		if downloadURL := asset.GetBrowserDownloadURL(); re.MatchString(downloadURL) {
			releaseURL = downloadURL
		}
	}

	return releaseURL, nil
}

func (z *ZIPReleaseGetter) getDownloadRegexp() (*regexp.Regexp, error) {
	if z.IsPlatformDependent {
		switch os := runtime.GOOS; os {
		case "darwin":
			return regexp.MustCompile(fmt.Sprintf(`(?i)%s_.*_Darwin_x86_64\.zip`, z.AssetName)), nil
		case "linux":
			return regexp.MustCompile(fmt.Sprintf(`(?i)%s_.*_Linux_x86_64\.zip`, z.AssetName)), nil
		default:
			return nil, fmt.Errorf("%s is not a supported platform for Porter binaries", os)
		}
	}

	return regexp.MustCompile(fmt.Sprintf(`(?i)%s_.*\.zip`, z.AssetName)), nil
}

type ZIPDownloader struct {
	ZipFolderDest   string
	ZipName         string
	AssetFolderDest string

	RemoveAfterDownload bool
}

func (z *ZIPDownloader) DownloadToFile(url string) error {
	// Get the data
	resp, err := http.Get(url)

	if err != nil {
		return err
	}

	defer resp.Body.Close()

	// Create the file
	out, err := os.Create(filepath.Join(z.ZipFolderDest, z.ZipName))

	if err != nil {
		return err
	}

	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)

	return err
}

func (z *ZIPDownloader) UnzipToDir() error {
	r, err := zip.OpenReader(filepath.Join(z.ZipFolderDest, z.ZipName))

	if err != nil {
		return err
	}

	defer r.Close()

	for _, f := range r.File {
		// Store filename/path for returning and using later on
		fpath := filepath.Join(z.AssetFolderDest, f.Name)

		// Check for ZipSlip. More Info: http://bit.ly/2MsjAWE
		if !strings.HasPrefix(fpath, filepath.Clean(z.AssetFolderDest)+string(os.PathSeparator)) {
			return fmt.Errorf("%s: illegal file path", fpath)
		}

		if f.FileInfo().IsDir() {
			// Make Folder
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		// delete file if exists
		os.Remove(fpath)

		// Make File
		if err = os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		_, err = io.Copy(outFile, rc)

		// Close the file without defer to close before next iteration of loop
		outFile.Close()
		rc.Close()

		if err != nil {
			return err
		}
	}

	if z.RemoveAfterDownload {
		os.Remove(filepath.Join(z.ZipFolderDest, z.ZipName))
	}

	return nil
}
