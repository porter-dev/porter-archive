package gitinstallation

import (
	"context"
	"net/http"
	"sync"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type GithubListBranchesHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewGithubListBranchesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GithubListBranchesHandler {
	return &GithubListBranchesHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GithubListBranchesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	client, err := GetGithubAppClientFromRequest(c.Config(), r)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// List all branches for a specified repo
	allBranches, resp, err := client.Repositories.ListBranches(context.Background(), owner, name, &github.BranchListOptions{
		ListOptions: github.ListOptions{
			PerPage: 100,
		},
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
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
			opts := &github.BranchListOptions{
				ListOptions: github.ListOptions{
					Page:    cp,
					PerPage: 100,
				},
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
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make(types.ListRepoBranchesResponse, 0)
	for _, b := range allBranches {
		res = append(res, b.GetName())
	}

	c.WriteResult(w, r, res)
}
