package buildpacks

import (
	"encoding/json"
	"strings"
	"sync"

	"github.com/google/go-github/github"
)

type apiNodeRuntime struct {
	wg sync.WaitGroup
}

func NewAPINodeRuntime() *apiNodeRuntime {
	return &apiNodeRuntime{}
}

func (runtime *apiNodeRuntime) detectYarn(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	yarnLockFound := false
	packageJSONFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if name == "yarn.lock" {
			yarnLockFound = true
		} else if name == "package.json" {
			packageJSONFound = true
		}
		if yarnLockFound && packageJSONFound {
			break
		}
	}
	if yarnLockFound && packageJSONFound {
		results <- struct {
			string
			bool
		}{yarn, true}
	} else {
		results <- struct {
			string
			bool
		}{yarn, false}
	}
	runtime.wg.Done()
}

func (runtime *apiNodeRuntime) detectNPM(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	packageJSONFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if name == "package.json" {
			packageJSONFound = true
			break
		}
	}
	if packageJSONFound {
		results <- struct {
			string
			bool
		}{npm, true}
	} else {
		results <- struct {
			string
			bool
		}{npm, false}
	}
	runtime.wg.Done()
}

func (runtime *apiNodeRuntime) detectStandalone(results chan struct {
	string
	bool
}, directoryContent []*github.RepositoryContent) {
	jsFileFound := false
	for i := 0; i < len(directoryContent); i++ {
		name := directoryContent[i].GetName()
		if name == "server.js" || name == "app.js" || name == "main.js" || name == "index.js" {
			jsFileFound = true
			break
		}
	}
	if jsFileFound {
		results <- struct {
			string
			bool
		}{standalone, true}
	} else {
		results <- struct {
			string
			bool
		}{standalone, false}
	}
	runtime.wg.Done()
}

func (runtime *apiNodeRuntime) Detect(directoryContent []*github.RepositoryContent) map[string]interface{} {
	results := make(chan struct {
		string
		bool
	}, 3)

	runtime.wg.Add(3)
	go runtime.detectYarn(results, directoryContent)
	go runtime.detectNPM(results, directoryContent)
	go runtime.detectStandalone(results, directoryContent)
	runtime.wg.Wait()
	close(results)

	atLeastOne := false
	detected := make(map[string]bool)
	for result := range results {
		if result.bool {
			atLeastOne = true
		}
		detected[result.string] = result.bool
	}

	if atLeastOne {
		if detected[yarn] || detected[npm] {
			// it is safe to assume that the project contains a package.json
			var packageJSONRef *github.RepositoryContent
			for i := 0; i < len(directoryContent); i++ {
				name := directoryContent[i].GetName()
				if name == "package.json" {
					packageJSONRef = directoryContent[i]
					break
				}
			}
			content, err := packageJSONRef.GetContent()
			if err != nil {
				// FIXME: log somewhere
				return nil
			}
			var packageJSON struct {
				Scripts map[string]string `json:"scripts"`
				Engines struct {
					Node string `json:"node"`
				} `json:"engines"`
			}
			err = json.NewDecoder(strings.NewReader(content)).Decode(&packageJSON)
			if err != nil {
				// FIXME: log somewhere
				return nil
			}

			if detected[yarn] {
				return map[string]interface{}{"runtime": yarn, "scripts": packageJSON.Scripts, "node_engine": packageJSON.Engines.Node}
			} else {
				return map[string]interface{}{"runtime": npm, "scripts": packageJSON.Scripts, "node_engine": packageJSON.Engines.Node}

			}
		}

		return map[string]interface{}{"runtime": "node-standalone"}
	}

	return nil
}
