package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"text/template"

	"github.com/google/go-github/v50/github"
)

type Tag struct {
	TagName string
}

func getLatestCLIRelease() (string, error) {
	client := github.NewClient(nil)

	rel, _, err := client.Repositories.GetLatestRelease(context.Background(), "porter-dev", "porter")

	if err != nil {
		return "", err
	}

	return rel.GetTagName(), nil
}

func serve(w http.ResponseWriter, req *http.Request) {
	latestTag, err := getLatestCLIRelease()

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	contents, err := os.ReadFile("install.sh")

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	tmpl, err := template.New("install").Parse(string(contents))

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	err = tmpl.Execute(w, Tag{TagName: latestTag})

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
	} else {
		w.Header().Add("Content-Type", "text/plain")
	}
}

func main() {
	var port string
	if port = os.Getenv("PORT"); port == "" {
		port = "80"
	}

	http.HandleFunc("/", serve)
	http.ListenAndServe(fmt.Sprintf(":%s", port), nil)
}
