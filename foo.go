package main

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/docker/distribution/reference"
)

const (
	repositoryURL = "us-central1-docker.pkg.dev/plural-porter/porter-11106/plural-server"
	tag           = "latest"
)

var ecrPattern = regexp.MustCompile(`(^[a-zA-Z0-9][a-zA-Z0-9-_]*)\.dkr\.ecr(\-fips)?\.([a-zA-Z0-9][a-zA-Z0-9-_]*)\.amazonaws\.com(\.cn)?`)

func GetServerURLFromTag(image string) (string, error) {
	named, err := reference.ParseNormalizedNamed(image)
	if err != nil {
		return "", err
	}

	domain := reference.Domain(named)

	if domain == "" {
		// if domain name is empty, use index.docker.io/v1
		return "index.docker.io/v1", nil
	} else if matches := ecrPattern.FindStringSubmatch(image); len(matches) >= 3 {
		// if this matches ECR, just use the domain name
		return domain, nil
	} else if strings.Contains(image, "gcr.io") || strings.Contains(image, "registry.digitalocean.com") {
		// if this matches GCR or DOCR, use the first path component
		return fmt.Sprintf("%s/%s", domain, strings.Split(reference.Path(named), "/")[0]), nil
	}

	// otherwise, best-guess is to get components of path that aren't the image name
	pathParts := strings.Split(reference.Path(named), "/")
	nonImagePath := ""

	if len(pathParts) > 1 {
		nonImagePath = strings.Join(pathParts[0:len(pathParts)-1], "/")
	}

	if err != nil {
		return "", err
	}

	if domain == "docker.io" {
		domain = "index.docker.io"
	}

	return fmt.Sprintf("%s/%s", domain, nonImagePath), nil
}

func main() {
	serverURL, err := GetServerURLFromTag(fmt.Sprintf("%s:%s", repositoryURL, tag))
	if err != nil {
		fmt.Println(err)
		return
	}

	if !strings.HasPrefix(serverURL, "https://") {
		serverURL = "https://" + serverURL
	}

	parsedURL, err := url.Parse(serverURL)
	if err != nil {
		fmt.Println(err)
		return
	}

	serverURL = parsedURL.Host + "/" + strings.Split(parsedURL.Path, "/")[0]

	fmt.Println(serverURL)
}
