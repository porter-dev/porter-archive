package buildpacks

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"github.com/google/go-github/github"
)

type apiNodeRuntime struct {
	ghClient *github.Client
	wg       sync.WaitGroup
}

func NewAPINodeRuntime(client *github.Client) *apiNodeRuntime {
	return &apiNodeRuntime{
		ghClient: client,
	}
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

func (runtime *apiNodeRuntime) Detect(
	directoryContent []*github.RepositoryContent,
	owner string, name string,
	repoContentOptions github.RepositoryContentGetOptions,
) map[string]interface{} {
	results := make(chan struct {
		string
		bool
	}, 3)

	fmt.Printf("Starting detection for a NodeJS runtime for %s/%s\n", owner, name)
	runtime.wg.Add(3)
	fmt.Println("Checking for yarn")
	go runtime.detectYarn(results, directoryContent)
	fmt.Println("Checking for NPM")
	go runtime.detectNPM(results, directoryContent)
	fmt.Println("Checking for NodeJS standalone")
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
			fmt.Println("package.json file detected")
			fileContent, _, _, err := runtime.ghClient.Repositories.GetContents(
				context.Background(),
				owner,
				name,
				"package.json",
				&repoContentOptions,
			)
			if err != nil {
				fmt.Printf("Error fetching contents of package.json: %v\n", err)
				return nil
			}
			var packageJSON struct {
				Scripts map[string]string `json:"scripts"`
				Engines struct {
					Node string `json:"node"`
				} `json:"engines"`
			}

			data, err := fileContent.GetContent()
			if err != nil {
				fmt.Printf("Error calling GetContent() on package.json: %v\n", err)
				return nil
			}
			err = json.NewDecoder(strings.NewReader(data)).Decode(&packageJSON)
			if err != nil {
				fmt.Printf("Error decoding package.json contents to struct: %v\n", err)
				return nil
			}

			if detected[yarn] {
				fmt.Printf("NodeJS yarn runtime detected for %s/%s\n", owner, name)
				return map[string]interface{}{
					"runtime": yarn, "scripts": packageJSON.Scripts, "node_engine": packageJSON.Engines.Node,
				}
			} else {
				fmt.Printf("NodeJS npm runtime detected for %s/%s\n", owner, name)
				return map[string]interface{}{
					"runtime": npm, "scripts": packageJSON.Scripts, "node_engine": packageJSON.Engines.Node,
				}
			}
		}

		fmt.Printf("NodeJS standalone runtime detected for %s/%s\n", owner, name)
		return map[string]interface{}{"runtime": "node-standalone"}
	}

	fmt.Printf("No NodeJS runtime detected for %s/%s\n", owner, name)
	return nil
}
