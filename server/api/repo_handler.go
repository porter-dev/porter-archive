package api

// import (
// 	"context"
// 	"encoding/json"
// 	"fmt"
// 	"net/http"
// 	"net/url"
// 	"strconv"

// 	"golang.org/x/oauth2"

// 	"github.com/go-chi/chi"
// 	"github.com/google/go-github/v32/github"
// )

// // Repo represents a GitHub or Gitab repository
// type Repo struct {
// 	FullName string
// 	Kind     string
// }

// // DirectoryItem represents a file or subfolder in a repository
// type DirectoryItem struct {
// 	Path string
// 	Type string
// }

// // HandleListRepos retrieves a list of repo names
// func (app *App) HandleListRepos(w http.ResponseWriter, r *http.Request) {
// 	tok, err := app.githubTokenFromRequest(r)

// 	if err != nil {
// 		app.handleErrorInternal(err, w)
// 		return
// 	}

// 	res := make([]Repo, 0)

// 	client := github.NewClient(app.GithubConfig.Client(oauth2.NoContext, tok))

// 	// list all repositories for specified user
// 	repos, _, err := client.Repositories.List(context.Background(), "", nil)

// 	if err != nil {
// 		app.handleErrorInternal(err, w)
// 		return
// 	}

// 	// TODO -- check if repo has already been appended -- there may be duplicates
// 	for _, repo := range repos {
// 		res = append(res, Repo{
// 			FullName: repo.GetFullName(),
// 			Kind:     "github",
// 		})
// 	}

// 	json.NewEncoder(w).Encode(res)
// }

// // HandleGetBranches retrieves a list of branch names for a specified repo
// func (app *App) HandleGetBranches(w http.ResponseWriter, r *http.Request) {
// 	tok, err := app.githubTokenFromRequest(r)

// 	if err != nil {
// 		app.handleErrorInternal(err, w)
// 		return
// 	}

// 	name := chi.URLParam(r, "name")

// 	client := github.NewClient(app.GithubConfig.Client(oauth2.NoContext, tok))

// 	// List all branches for a specified repo
// 	branches, _, err := client.Repositories.ListBranches(context.Background(), "", name, nil)
// 	if err != nil {
// 		fmt.Println(err)
// 		return
// 	}

// 	res := []string{}
// 	for _, b := range branches {
// 		res = append(res, b.GetName())
// 	}

// 	json.NewEncoder(w).Encode(res)
// }

// // HandleGetBranchContents retrieves the contents of a specific branch and subdirectory
// func (app *App) HandleGetBranchContents(w http.ResponseWriter, r *http.Request) {
// 	tok, err := app.githubTokenFromRequest(r)

// 	if err != nil {
// 		app.handleErrorInternal(err, w)
// 		return
// 	}

// 	client := github.NewClient(app.GithubConfig.Client(oauth2.NoContext, tok))

// 	queryParams, err := url.ParseQuery(r.URL.RawQuery)
// 	if err != nil {
// 		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
// 		return
// 	}

// 	name := chi.URLParam(r, "name")
// 	branch := chi.URLParam(r, "branch")

// 	repoContentOptions := github.RepositoryContentGetOptions{}
// 	repoContentOptions.Ref = branch
// 	_, directoryContents, _, err := client.Repositories.GetContents(context.Background(), "", name, queryParams["dir"][0], &repoContentOptions)
// 	if err != nil {
// 		app.handleErrorInternal(err, w)
// 		return
// 	}

// 	res := []DirectoryItem{}
// 	for i := range directoryContents {
// 		d := DirectoryItem{}
// 		d.Path = *directoryContents[i].Path
// 		d.Type = *directoryContents[i].Type
// 		res = append(res, d)
// 	}

// 	// Ret2: recursively traverse all dirs to create config bundle (case on type == dir)
// 	// https://api.github.com/repos/porter-dev/porter/contents?ref=frontend-graph
// 	// fmt.Println(res)
// 	json.NewEncoder(w).Encode(res)
// }

// func (app *App) githubTokenFromRequest(
// 	r *http.Request,
// ) (*oauth2.Token, error) {
// 	// read project id
// 	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

// 	if err != nil || projID == 0 {
// 		return nil, fmt.Errorf("could not read project id")
// 	}

// 	// read user id
// 	session, err := app.store.Get(r, app.cookieName)

// 	if err != nil {
// 		return nil, fmt.Errorf("could not read user id")
// 	}

// 	userID, ok := session.Values["user_id"].(uint)

// 	if !ok {
// 		return nil, fmt.Errorf("could not read user id")
// 	}

// 	// query for repo client
// 	gitRepos, err := app.repo.GitRepo.ListGitReposByProjectID(uint(projID))

// 	if err != nil {
// 		return nil, err
// 	}

// 	for _, rc := range repoClients {
// 		// find the RepoClient that matches the user id in the request
// 		if rc.UserID == userID {
// 			// TODO -- refresh token is irrelevant at the moment, because the access token
// 			// doesn't expire.
// 			return &oauth2.Token{
// 				AccessToken:  string(rc.AccessToken),
// 				RefreshToken: string(rc.RefreshToken),
// 				TokenType:    "Bearer",
// 			}, nil
// 		}
// 	}

// 	return nil, fmt.Errorf("could not find matching token")
// }
