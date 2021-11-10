package buildpacks

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"github.com/Masterminds/semver/v3"
	"github.com/google/go-github/github"
)

var (
	lts = map[string]int{
		"argon":   4,
		"boron":   6,
		"carbon":  8,
		"dubnium": 10,
	}
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

// copied directly from https://github.com/paketo-buildpacks/node-engine/blob/main/nvmrc_parser.go
func validateNvmrc(content string) (string, error) {
	content = strings.TrimSpace(strings.ToLower(content))

	if content == "lts/*" || content == "node" {
		return content, nil
	}

	for key := range lts {
		if content == strings.ToLower("lts/"+key) {
			return content, nil
		}
	}

	content = strings.TrimPrefix(content, "v")

	if _, err := semver.NewConstraint(content); err != nil {
		return "", fmt.Errorf("invalid version constraint specified in .nvmrc: %q", content)
	}

	return content, nil
}

// copied directly from https://github.com/paketo-buildpacks/node-engine/blob/main/nvmrc_parser.go
func formatNvmrcContent(version string) string {
	if version == "node" {
		return "*"
	}

	if strings.HasPrefix(version, "lts") {
		ltsName := strings.SplitN(version, "/", 2)[1]
		if ltsName == "*" {
			var maxVersion int
			for _, versionValue := range lts {
				if maxVersion < versionValue {
					maxVersion = versionValue
				}
			}

			return fmt.Sprintf("%d.*", maxVersion)
		}

		return fmt.Sprintf("%d.*", lts[ltsName])
	}

	return version
}

// copied directly from https://github.com/paketo-buildpacks/node-engine/blob/main/node_version_parser.go
func validateNodeVersion(content string) (string, error) {
	content = strings.TrimSpace(strings.ToLower(content))

	content = strings.TrimPrefix(content, "v")

	if _, err := semver.NewConstraint(content); err != nil {
		return "", fmt.Errorf("invalid version constraint specified in .node-version: %q", content)
	}

	return content, nil
}

func (runtime *apiNodeRuntime) Detect(
	directoryContent []*github.RepositoryContent,
	owner, name, path string,
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
				fmt.Sprintf("%s/package.json", path),
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

			if packageJSON.Engines.Node == "" {
				// we should now check for the node engine version in .nvmrc and then .node-version
				nvmrcFound := false
				nodeVersionFound := false
				for i := 0; i < len(directoryContent); i++ {
					name := directoryContent[i].GetName()
					if name == ".nvmrc" {
						nvmrcFound = true
					} else if name == ".node-version" {
						nodeVersionFound = true
					}
				}

				if nvmrcFound {
					// copy exact behavior of https://github.com/paketo-buildpacks/node-engine/blob/main/nvmrc_parser.go
					fileContent, _, _, err = runtime.ghClient.Repositories.GetContents(
						context.Background(),
						owner,
						name,
						fmt.Sprintf("%s/.nvmrc", path),
						&repoContentOptions,
					)
					if err != nil {
						fmt.Printf("Error fetching contents of .nvmrc: %v\n", err)
						return nil
					}
					data, err = fileContent.GetContent()
					if err != nil {
						fmt.Printf("Error calling GetContent() on .nvmrc: %v\n", err)
						return nil
					}
					nvmrcVersion, err := validateNvmrc(data)
					if err != nil {
						fmt.Printf("Error validating .nvmrc: %v\n", err)
						return nil
					}
					nvmrcVersion = formatNvmrcContent(nvmrcVersion)

					if nvmrcVersion != "*" {
						packageJSON.Engines.Node = data
					}
				}

				if packageJSON.Engines.Node == "" && nodeVersionFound {
					// copy exact behavior of https://github.com/paketo-buildpacks/node-engine/blob/main/node_version_parser.go
					fileContent, _, _, err = runtime.ghClient.Repositories.GetContents(
						context.Background(),
						owner,
						name,
						fmt.Sprintf("%s/.node-version", path),
						&repoContentOptions,
					)
					if err != nil {
						fmt.Printf("Error fetching contents of .node-version: %v\n", err)
						return nil
					}
					data, err = fileContent.GetContent()
					if err != nil {
						fmt.Printf("Error calling GetContent() on .node-version: %v\n", err)
						return nil
					}
					nodeVersion, err := validateNodeVersion(data)
					if err != nil {
						fmt.Printf("Error validating .node-version: %v\n", err)
						return nil
					}
					if nodeVersion != "" {
						packageJSON.Engines.Node = nodeVersion
					}
				}
			}

			if packageJSON.Engines.Node == "" {
				// use the default node engine version from https://github.com/paketo-buildpacks/node-engine/blob/main/buildpack.toml
				packageJSON.Engines.Node = "16.*.*"
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
