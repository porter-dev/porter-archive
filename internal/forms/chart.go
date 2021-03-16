package forms

import "net/url"

// ChartForm is the base type for CRUD operations on charts
type ChartForm struct {
	RepoURL string 
	Name    string `json:"name"`
	Version string `json:"version"`
}

// PopulateRepoURLFromQueryParams populates the repo url in the ChartForm using the passed
// url.Values (the parsed query params)
func (cf *ChartForm) PopulateRepoURLFromQueryParams(
	vals url.Values,
) error {
	if repoURL, ok := vals["repo_url"]; ok && len(repoURL) == 1 {
		cf.RepoURL = repoURL[0]
	}

	return nil
}
