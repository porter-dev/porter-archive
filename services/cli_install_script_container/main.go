package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"text/template"

	"github.com/google/go-github/v50/github"
	"golang.org/x/oauth2"
)

var ghClient *github.Client

type Tag struct {
	TagName string
}

func getLatestCLIRelease() (string, error) {
	rel, _, err := ghClient.Repositories.GetLatestRelease(context.Background(), "porter-dev", "porter")
	if err != nil {
		return "", err
	}

	return rel.GetTagName(), nil
}

func serve(w http.ResponseWriter, req *http.Request) {
	latestTag, err := getLatestCLIRelease()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error getting latest release: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	contents, err := os.ReadFile("install.sh")
	if err != nil {
		fmt.Fprintf(os.Stderr, "error reading install.sh file: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	tmpl, err := template.New("install").Parse(string(contents))
	if err != nil {
		fmt.Fprintf(os.Stderr, "error parsing install.sh template: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = tmpl.Execute(w, Tag{TagName: latestTag})

	if err != nil {
		fmt.Fprintf(os.Stderr, "error executing install.sh template: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
	} else {
		w.Header().Add("Content-Type", "text/plain")
	}
}

func main() {
	ghAccessToken := os.Getenv("GH_ACCESS_TOKEN")

	if ghAccessToken == "" {
		fmt.Fprintf(os.Stderr, "GH_ACCESS_TOKEN not set\n")
		return
	}

	ghClient = github.NewClient(oauth2.NewClient(context.Background(), oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: ghAccessToken},
	)))

	var port string

	if port = os.Getenv("PORT"); port == "" {
		port = "80"
	}

	http.HandleFunc("/", serve)

	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), nil); err != nil {
		fmt.Fprintf(os.Stderr, "error starting server: %v\n", err)
	}
}
