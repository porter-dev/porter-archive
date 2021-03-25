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

	client := github.NewClient(app.GithubProjectConf.Client(oauth2.NoContext, tok))

	allRepos := make([]*github.Repository, 0)

	opt := &github.RepositoryListOptions{
		ListOptions: github.ListOptions{
			PerPage: 100,
		},
		Sort: "updated",
	}

	for {
		repos, resp, err := client.Repositories.List(context.Background(), "", opt)

		if err != nil {
			app.handleErrorInternal(err, w)
			return
		}

		allRepos = append(allRepos, repos...)

		if resp.NextPage == 0 {
			break
		}

		opt.Page = resp.NextPage
	}

	for _, repo := range allRepos {
		res = append(res, Repo{
			FullName: repo.GetFullName(),
			Kind:     "github",
		})
	}

	json.NewEncoder(w).Encode(res)
}

// HandleDeleteProjectGitRepo handles the deletion of a Github Repo via the git repo ID
func (app *App) HandleDeleteProjectGitRepo(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "git_repo_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	repo, err := app.Repo.GitRepo.ReadGitRepo(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	err = app.Repo.GitRepo.DeleteGitRepo(repo)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleGetBranches retrieves a list of branch names for a specified repo
func (app *App) HandleGetBranches(w http.ResponseWriter, r *http.Request) {
	tok, err := app.githubTokenFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "name")

	client := github.NewClient(app.GithubProjectConf.Client(oauth2.NoContext, tok))

	// List all branches for a specified repo
	branches, _, err := client.Repositories.ListBranches(context.Background(), owner, name, nil)
	if err != nil {
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

	client := github.NewClient(app.GithubProjectConf.Client(oauth2.NoContext, tok))

	queryParams, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "name")
	branch := chi.URLParam(r, "branch")

	repoContentOptions := github.RepositoryContentGetOptions{}
	repoContentOptions.Ref = branch
	_, directoryContents, _, err := client.Repositories.GetContents(context.Background(), owner, name, queryParams["dir"][0], &repoContentOptions)
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
