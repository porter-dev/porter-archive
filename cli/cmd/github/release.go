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

func getLatestReleaseDownloadURL() (string, string, error) {
	client := github.NewClient(nil)

	rel, _, err := client.Repositories.GetLatestRelease(context.Background(), "porter-dev", "porter")

	if err != nil {
		return "", "", err
	}

	var re *regexp.Regexp

	switch os := runtime.GOOS; os {
	case "darwin":
		re = regexp.MustCompile(`portersvr_.*_Darwin_x86_64\.zip`)
	case "linux":
		re = regexp.MustCompile(`portersvr_.*_Linux_x86_64\.zip`)
	default:
		fmt.Printf("%s.\n", os)
	}

	staticRE := regexp.MustCompile(`static_.*\.zip`)

	releaseURL := ""
	staticReleaseURL := ""

	// iterate through the assets
	for _, asset := range rel.Assets {
		if downloadURL := asset.GetBrowserDownloadURL(); re.MatchString(downloadURL) {
			releaseURL = downloadURL
		} else if staticRE.MatchString(downloadURL) {
			staticReleaseURL = downloadURL
		}
	}

	return releaseURL, staticReleaseURL, nil
}

// DownloadLatestServerRelease retrieves the latest Porter server release from Github, unzips
// it, and adds the binary to the porter directory
func DownloadLatestServerRelease(porterDir string) error {
	releaseURL, staticReleaseURL, err := getLatestReleaseDownloadURL()
	fmt.Println(releaseURL)

	if err != nil {
		return err
	}

	zipFile := filepath.Join(porterDir, "portersrv_latest.zip")

	err = downloadToFile(releaseURL, zipFile)

	if err != nil {
		return err
	}

	err = unzipToDir(zipFile, porterDir)

	if err != nil {
		return err
	}

	staticZipFile := filepath.Join(porterDir, "static_latest.zip")

	err = downloadToFile(staticReleaseURL, staticZipFile)

	if err != nil {
		return err
	}

	staticDir := filepath.Join(porterDir, "static")

	err = unzipToDir(staticZipFile, staticDir)

	return err
}

func downloadToFile(url string, filepath string) error {
	fmt.Println("Downloading:", url)

	// Get the data
	resp, err := http.Get(url)

	if err != nil {
		return err
	}

	defer resp.Body.Close()

	// Create the file
	out, err := os.Create(filepath)

	if err != nil {
		return err
	}

	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)

	return err
}

func unzipToDir(zipfile string, dir string) error {
	r, err := zip.OpenReader(zipfile)

	if err != nil {
		return err
	}

	defer r.Close()

	for _, f := range r.File {
		// Store filename/path for returning and using later on
		fpath := filepath.Join(dir, f.Name)

		// Check for ZipSlip. More Info: http://bit.ly/2MsjAWE
		if !strings.HasPrefix(fpath, filepath.Clean(dir)+string(os.PathSeparator)) {
			return fmt.Errorf("%s: illegal file path", fpath)
		}

		if f.FileInfo().IsDir() {
			// Make Folder
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

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

	return nil
}
