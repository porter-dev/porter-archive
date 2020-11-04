package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/go-chi/chi"
	"github.com/google/go-github/v32/github"
)

// Repo represents a GitHub or Gitab repository
type Repo struct {
	FullName string
	Kind     string
}

// DirectoryItem represents a file or subfolder in a repository
type DirectoryItem struct {
	Path string
	Type string
}

// HandleListRepos retrieves a list of repo names
func (app *App) HandleListRepos(w http.ResponseWriter, r *http.Request) {
	client := github.NewClient(nil)

	// list all organizations for specified user
	// TODO: fix hardcoded user/org
	repos, _, err := client.Repositories.List(context.Background(), "porter-dev", nil)
	if err != nil {
		fmt.Println(err)
		return
	}

	res := []Repo{}
	for i := range repos {
		r := Repo{}
		r.FullName = *repos[i].FullName
		r.Kind = "github"
		res = append(res, r)
	}
	json.NewEncoder(w).Encode(res)
}

// HandleGetBranches retrieves a list of branch names for a specified repo
func (app *App) HandleGetBranches(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	client := github.NewClient(nil)

	// List all branches for a specified repo
	// TODO: fix hardcoded user/org
	branches, _, err := client.Repositories.ListBranches(context.Background(), "porter-dev", name, nil)
	if err != nil {
		fmt.Println(err)
		return
	}

	res := []string{}
	for i := range branches {
		b := *branches[i].Name
		res = append(res, b)
	}
	json.NewEncoder(w).Encode(res)
}

// HandleGetBranchContents retrieves the contents of a specific branch and subdirectory
func (app *App) HandleGetBranchContents(w http.ResponseWriter, r *http.Request) {
	queryParams, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	name := chi.URLParam(r, "name")
	branch := chi.URLParam(r, "branch")
	client := github.NewClient(nil)

	// TODO: fix hardcoded user/org
	repoContentOptions := github.RepositoryContentGetOptions{}
	repoContentOptions.Ref = branch
	_, directoryContents, _, err := client.Repositories.GetContents(context.Background(), "porter-dev", name, queryParams["dir"][0], &repoContentOptions)
	if err != nil {
		fmt.Println(err)
		return
	}

	res := []DirectoryItem{}
	for i := range directoryContents {
		d := DirectoryItem{}
		d.Path = *directoryContents[i].Path
		d.Type = *directoryContents[i].Type
		res = append(res, d)
	}

	// Ret2: recursively traverse all dirs to create config bundle (case on type == dir)
	// https://api.github.com/repos/porter-dev/porter/contents?ref=frontend-graph
	fmt.Println(res)
	json.NewEncoder(w).Encode(res)
}
