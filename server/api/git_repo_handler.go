package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"golang.org/x/oauth2"

	"github.com/go-chi/chi"
	"github.com/google/go-github/github"
	"github.com/porter-dev/porter/internal/models"
)

// HandleListProjectGitRepos returns a list of git repos for a project
func (app *App) HandleListProjectGitRepos(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	grs, err := app.Repo.GitRepo.ListGitReposByProjectID(uint(projID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	extGRs := make([]*models.GitRepoExternal, 0)

	for _, gr := range grs {
		extGRs = append(extGRs, gr.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(extGRs); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

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
	tok, err := app.githubTokenFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	res := make([]Repo, 0)

	client := github.NewClient(app.GithubConf.Client(oauth2.NoContext, tok))

	// list all repositories for specified user
	repos, _, err := client.Repositories.List(context.Background(), "", nil)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// TODO -- check if repo has already been appended -- there may be duplicates
	for _, repo := range repos {
		res = append(res, Repo{
			FullName: repo.GetFullName(),
			Kind:     "github",
		})
	}

	json.NewEncoder(w).Encode(res)
}

// HandleGetBranches retrieves a list of branch names for a specified repo
func (app *App) HandleGetBranches(w http.ResponseWriter, r *http.Request) {
	tok, err := app.githubTokenFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	name := chi.URLParam(r, "name")

	client := github.NewClient(app.GithubConf.Client(oauth2.NoContext, tok))

	// List all branches for a specified repo
	branches, _, err := client.Repositories.ListBranches(context.Background(), "", name, nil)
	if err != nil {
		fmt.Println(err)
		return
	}

	res := []string{}
	for _, b := range branches {
		res = append(res, b.GetName())
	}

	json.NewEncoder(w).Encode(res)
}

// HandleGetBranchContents retrieves the contents of a specific branch and subdirectory
func (app *App) HandleGetBranchContents(w http.ResponseWriter, r *http.Request) {
	tok, err := app.githubTokenFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	client := github.NewClient(app.GithubConf.Client(oauth2.NoContext, tok))

	queryParams, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	name := chi.URLParam(r, "name")
	branch := chi.URLParam(r, "branch")

	repoContentOptions := github.RepositoryContentGetOptions{}
	repoContentOptions.Ref = branch
	_, directoryContents, _, err := client.Repositories.GetContents(context.Background(), "", name, queryParams["dir"][0], &repoContentOptions)
	if err != nil {
		app.handleErrorInternal(err, w)
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
	// fmt.Println(res)
	json.NewEncoder(w).Encode(res)
}

// finds the github token given the git repo id and the project id
func (app *App) githubTokenFromRequest(
	r *http.Request,
) (*oauth2.Token, error) {
	grID, err := strconv.ParseUint(chi.URLParam(r, "git_repo_id"), 0, 64)

	if err != nil || grID == 0 {
		return nil, fmt.Errorf("could not read git repo id")
	}

	// query for the git repo
	gr, err := app.Repo.GitRepo.ReadGitRepo(uint(grID))

	if err != nil {
		return nil, err
	}

	// get the oauth integration
	oauthInt, err := app.Repo.OAuthIntegration.ReadOAuthIntegration(gr.OAuthIntegrationID)

	if err != nil {
		return nil, err
	}

	return &oauth2.Token{
		AccessToken:  string(oauthInt.AccessToken),
		RefreshToken: string(oauthInt.RefreshToken),
		TokenType:    "Bearer",
	}, nil
}
