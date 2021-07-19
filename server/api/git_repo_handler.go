package api

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/porter-dev/porter/internal/models"
	"golang.org/x/oauth2"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/bradleyfalzon/ghinstallation"
	"github.com/go-chi/chi"
	"github.com/google/go-github/github"
)

// HandleListProjectGitRepos returns a list of git repos for a project
func (app *App) HandleListProjectGitRepos(w http.ResponseWriter, r *http.Request) {

	tok, err := app.getGithubAppOauthTokenFromRequest(r)

	if err != nil {
		json.NewEncoder(w).Encode(make([]*models.GitRepoExternal, 0))
		return
	}

	client := github.NewClient(app.GithubProjectConf.Client(oauth2.NoContext, tok))

	accountIds := make([]int64, 0)

	AuthUser, _, err := client.Users.Get(context.Background(), "")

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	accountIds = append(accountIds, *AuthUser.ID)

	opts := &github.ListOptions{
		PerPage: 100,
		Page:    1,
	}

	for {
		orgs, pages, err := client.Organizations.List(context.Background(), "", opts)

		if err != nil {
			res := HandleListGithubAppAccessResp{
				HasAccess: false,
			}
			json.NewEncoder(w).Encode(res)
			return
		}

		for _, org := range orgs {
			accountIds = append(accountIds, *org.ID)
		}

		if pages.NextPage == 0 {
			break
		}
	}

	installationData, err := app.Repo.GithubAppInstallation.ReadGithubAppInstallationByAccountIDs(accountIds)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	installationIds := make([]int64, 0)

	for _, v := range installationData {
		installationIds = append(installationIds, v.InstallationID)
	}

	json.NewEncoder(w).Encode(installationIds)
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

// AutoBuildpack represents an automatically detected buildpack
type AutoBuildpack struct {
	Valid bool   `json:"valid"`
	Name  string `json:"name"`
}

// HandleListRepos retrieves a list of repo names
func (app *App) HandleListRepos(w http.ResponseWriter, r *http.Request) {

	client, err := app.githubAppClientFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// figure out number of repositories
	opt := &github.ListOptions{
		PerPage: 100,
	}

	allRepos, resp, err := client.Apps.ListRepos(context.Background(), opt)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// make workers to get pages concurrently
	const WCOUNT = 5
	numPages := resp.LastPage + 1
	var workerErr error
	var mu sync.Mutex
	var wg sync.WaitGroup

	worker := func(cp int) {
		defer wg.Done()

		for cp < numPages {
			cur_opt := &github.ListOptions{
				Page:    cp,
				PerPage: 100,
			}

			repos, _, err := client.Apps.ListRepos(context.Background(), cur_opt)

			if err != nil {
				mu.Lock()
				workerErr = err
				mu.Unlock()
				return
			}

			mu.Lock()
			allRepos = append(allRepos, repos...)
			mu.Unlock()

			cp += WCOUNT
		}
	}

	var numJobs int
	if numPages > WCOUNT {
		numJobs = WCOUNT
	} else {
		numJobs = numPages
	}

	wg.Add(numJobs)

	// page 1 is already loaded so we start with 2
	for i := 1; i <= numJobs; i++ {
		go worker(i + 1)
	}

	wg.Wait()

	if workerErr != nil {
		app.handleErrorInternal(workerErr, w)
		return
	}

	res := make([]Repo, 0)

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
	allBranches, resp, err := client.Repositories.ListBranches(context.Background(), owner, name, &github.ListOptions{
		PerPage: 100,
	})

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// make workers to get branches concurrently
	const WCOUNT = 5
	numPages := resp.LastPage + 1
	var workerErr error
	var mu sync.Mutex
	var wg sync.WaitGroup

	worker := func(cp int) {
		defer wg.Done()

		for cp < numPages {
			opts := &github.ListOptions{
				Page:    cp,
				PerPage: 100,
			}

			branches, _, err := client.Repositories.ListBranches(context.Background(), owner, name, opts)

			if err != nil {
				mu.Lock()
				workerErr = err
				mu.Unlock()
				return
			}

			mu.Lock()
			allBranches = append(allBranches, branches...)
			mu.Unlock()

			cp += WCOUNT
		}
	}

	var numJobs int
	if numPages > WCOUNT {
		numJobs = WCOUNT
	} else {
		numJobs = numPages
	}

	wg.Add(numJobs)

	// page 1 is already loaded so we start with 2
	for i := 1; i <= numJobs; i++ {
		go worker(i + 1)
	}

	wg.Wait()

	if workerErr != nil {
		app.handleErrorInternal(workerErr, w)
		return
	}

	res := make([]string, 0)
	for _, b := range allBranches {
		res = append(res, b.GetName())
	}

	json.NewEncoder(w).Encode(res)
}

// HandleDetectBuildpack attempts to figure which buildpack will be auto used based on directory contents
func (app *App) HandleDetectBuildpack(w http.ResponseWriter, r *http.Request) {
	tok, err := app.githubTokenFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	queryParams, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	client := github.NewClient(app.GithubProjectConf.Client(oauth2.NoContext, tok))
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

	var BREQS = map[string]string{
		"requirements.txt": "Python",
		"Gemfile":          "Ruby",
		"package.json":     "Node.js",
		"pom.xml":          "Java",
		"composer.json":    "PHP",
	}

	res := AutoBuildpack{
		Valid: true,
	}
	matches := 0

	for i := range directoryContents {
		name := *directoryContents[i].Name

		bname, ok := BREQS[name]
		if ok {
			matches++
			res.Name = bname
		}
	}

	if matches != 1 {
		res.Valid = false
		res.Name = ""
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

type GetProcfileContentsResp map[string]string

var procfileRegex = regexp.MustCompile("^([A-Za-z0-9_]+):\\s*(.+)$")

// HandleGetProcfileContents retrieves the contents of a procfile in a github repo
func (app *App) HandleGetProcfileContents(w http.ResponseWriter, r *http.Request) {
	tok, err := app.githubTokenFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	client := github.NewClient(app.GithubProjectConf.Client(oauth2.NoContext, tok))
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "name")
	branch := chi.URLParam(r, "branch")

	queryParams, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	resp, _, _, err := client.Repositories.GetContents(
		context.TODO(),
		owner,
		name,
		queryParams["path"][0],
		&github.RepositoryContentGetOptions{
			Ref: branch,
		},
	)

	if err != nil {
		http.NotFound(w, r)
		return
	}

	fileData, err := resp.GetContent()

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	parsedContents := make(GetProcfileContentsResp)

	// parse the procfile information
	for _, line := range strings.Split(fileData, "\n") {
		if matches := procfileRegex.FindStringSubmatch(line); matches != nil {
			parsedContents[matches[1]] = matches[2]
		}
	}

	json.NewEncoder(w).Encode(parsedContents)
}

type HandleGetRepoZIPDownloadURLResp struct {
	URLString       string `json:"url"`
	LatestCommitSHA string `json:"latest_commit_sha"`
}

// HandleGetRepoZIPDownloadURL gets the URL for downloading a zip file from a Github
// repository
func (app *App) HandleGetRepoZIPDownloadURL(w http.ResponseWriter, r *http.Request) {
	tok, err := app.githubTokenFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	client := github.NewClient(app.GithubProjectConf.Client(oauth2.NoContext, tok))
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "name")
	branch := chi.URLParam(r, "branch")

	branchResp, _, err := client.Repositories.GetBranch(
		context.TODO(),
		owner,
		name,
		branch,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	ghURL, _, err := client.Repositories.GetArchiveLink(
		context.TODO(),
		owner,
		name,
		github.Zipball,
		&github.RepositoryContentGetOptions{
			Ref: *branchResp.Commit.SHA,
		},
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	apiResp := HandleGetRepoZIPDownloadURLResp{
		URLString:       ghURL.String(),
		LatestCommitSHA: *branchResp.Commit.SHA,
	}

	json.NewEncoder(w).Encode(apiResp)
}

// githubAppClientFromRequest gets the github app installation id from the request and authenticates
// using it and a private key file
func (app *App) githubAppClientFromRequest(r *http.Request) (*github.Client, error) {

	installationID, err := strconv.ParseUint(chi.URLParam(r, "installation_id"), 0, 64)

	if err != nil || installationID == 0 {
		return nil, fmt.Errorf("could not read installation id")
	}

	itr, err := ghinstallation.NewKeyFromFile(
		http.DefaultTransport,
		app.GithubAppConf.AppID,
		int64(installationID),
		"/porter/docker/github_app_private_key.pem")

	if err != nil {
		return nil, err
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
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
