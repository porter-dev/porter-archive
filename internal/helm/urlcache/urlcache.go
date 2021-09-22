package urlcache

import "github.com/porter-dev/porter/internal/helm/loader"

// ChartLookupURLs contains an in-memory store of Porter chart names matched with
// a repo URL, so that finding a chart does not involve multiple lookups to our
// chart repo's index.yaml file
type ChartURLCache struct {
	cache map[string]string
	urls  []string
}

func Init(urls ...string) *ChartURLCache {
	res := &ChartURLCache{
		cache: make(map[string]string),
		urls:  urls,
	}

	res.Update()

	return res
}

func (c *ChartURLCache) Update() {
	newCharts := make(map[string]string)

	for _, chartRepo := range c.urls {
		indexFile, err := loader.LoadRepoIndexPublic(chartRepo)

		if err != nil {
			continue
		}

		for chartName := range indexFile.Entries {
			newCharts[chartName] = chartRepo
		}
	}

	c.cache = newCharts
}

func (c *ChartURLCache) GetURL(chartName string) (string, bool) {
	res, ok := c.cache[chartName]

	return res, ok
}
