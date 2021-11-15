package buildpacks

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"regexp"
	"strings"
	"sync"

	"github.com/google/go-github/github"
	"github.com/pelletier/go-toml"
)

type apiRubyRuntime struct {
	wg    sync.WaitGroup
	packs map[string]*BuildpackInfo
}

// FIXME: should be called once at the top-level somewhere in the backend
func populateRubyPacks(client *github.Client) map[string]*BuildpackInfo {
	packs := make(map[string]*BuildpackInfo)

	repoRelease, _, err := client.Repositories.GetLatestRelease(context.Background(), "paketo-buildpacks", "ruby")
	if err != nil {
		fmt.Printf("Error fetching latest release for paketo-buildpacks/ruby: %v\n", err)
		return nil
	}
	fileContent, _, _, err := client.Repositories.GetContents(
		context.Background(), "paketo-buildpacks", "ruby", "buildpack.toml",
		&github.RepositoryContentGetOptions{
			Ref: *repoRelease.TagName,
		},
	)
	if err != nil {
		fmt.Printf("Error fetching contents of buildpack.toml for paketo-buildpacks/ruby: %v\n", err)
		return nil
	}

	data, err := fileContent.GetContent()
	if err != nil {
		fmt.Printf("Error calling GetContent() on buildpack.toml for paketo-buildpacks/ruby: %v\n", err)
		return nil
	}

	buildpackToml, err := toml.Load(data)
	if err != nil {
		fmt.Printf("Error while reading buildpack.toml from paketo-buildpacks/ruby: %v\n", err)
		os.Exit(1)
	}
	order := buildpackToml.Get("order").([]*toml.Tree)

	// puma
	packs[puma] = newBuildpackInfo()
	pumaGroup := order[0].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(pumaGroup); i++ {
		packs[puma].addPack(
			buildpackOrderGroupInfo{
				ID:       pumaGroup[i].Get("id").(string),
				Optional: pumaGroup[i].GetDefault("optional", false).(bool),
				Version:  pumaGroup[i].Get("version").(string),
			},
		)
	}

	// thin
	packs[thin] = newBuildpackInfo()
	thinGroup := order[1].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(thinGroup); i++ {
		packs[thin].addPack(
			buildpackOrderGroupInfo{
				ID:       thinGroup[i].Get("id").(string),
				Optional: thinGroup[i].GetDefault("optional", false).(bool),
				Version:  thinGroup[i].Get("version").(string),
			},
		)
	}

	// unicorn
	packs[unicorn] = newBuildpackInfo()
	unicornGroup := order[2].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(unicornGroup); i++ {
		packs[unicorn].addPack(
			buildpackOrderGroupInfo{
				ID:       unicornGroup[i].Get("id").(string),
				Optional: unicornGroup[i].GetDefault("optional", false).(bool),
				Version:  unicornGroup[i].Get("version").(string),
			},
		)
	}

	// passenger
	packs[passenger] = newBuildpackInfo()
	passengerGroup := order[3].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(passengerGroup); i++ {
		packs[passenger].addPack(
			buildpackOrderGroupInfo{
				ID:       passengerGroup[i].Get("id").(string),
				Optional: passengerGroup[i].GetDefault("optional", false).(bool),
				Version:  passengerGroup[i].Get("version").(string),
			},
		)
	}

	// rackup
	packs[rackup] = newBuildpackInfo()
	rackupGroup := order[4].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(rackupGroup); i++ {
		packs[rackup].addPack(
			buildpackOrderGroupInfo{
				ID:       rackupGroup[i].Get("id").(string),
				Optional: rackupGroup[i].GetDefault("optional", false).(bool),
				Version:  rackupGroup[i].Get("version").(string),
			},
		)
	}

	// rake
	packs[rake] = newBuildpackInfo()
	rakeGroup := order[5].GetArray("group").([]*toml.Tree)
	for i := 0; i < len(rakeGroup); i++ {
		packs[rake].addPack(
			buildpackOrderGroupInfo{
				ID:       rakeGroup[i].Get("id").(string),
				Optional: rakeGroup[i].GetDefault("optional", false).(bool),
				Version:  rakeGroup[i].Get("version").(string),
			},
		)
	}

	return packs
}

func NewAPIRubyRuntime() APIRuntime {
	return &apiRubyRuntime{}
}

func (runtime *apiRubyRuntime) detectPuma(gemfileContent string, results chan struct {
	string
	bool
}) {
	pumaFound := false
	quotes := `["']`
	pumaRe := regexp.MustCompile(fmt.Sprintf(`^\s*gem %spuma%s`, quotes, quotes))
	scanner := bufio.NewScanner(strings.NewReader(gemfileContent))
	for scanner.Scan() {
		line := []byte(scanner.Text())
		if pumaRe.Match(line) {
			pumaFound = true
			break
		}
	}
	if pumaFound {
		results <- struct {
			string
			bool
		}{puma, true}
	} else {
		results <- struct {
			string
			bool
		}{puma, false}
	}
	runtime.wg.Done()
}

func (runtime *apiRubyRuntime) detectThin(gemfileContent string, results chan struct {
	string
	bool
}) {
	thinFound := false
	quotes := `["']`
	thinRe := regexp.MustCompile(fmt.Sprintf(`^\s*gem %sthin%s`, quotes, quotes))
	scanner := bufio.NewScanner(strings.NewReader(gemfileContent))
	for scanner.Scan() {
		line := []byte(scanner.Text())
		if thinRe.Match(line) {
			thinFound = true
			break
		}
	}
	if thinFound {
		results <- struct {
			string
			bool
		}{thin, true}
	} else {
		results <- struct {
			string
			bool
		}{thin, false}
	}
	runtime.wg.Done()
}

func (runtime *apiRubyRuntime) detectUnicorn(gemfileContent string, results chan struct {
	string
	bool
}) {
	unicornFound := false
	quotes := `["']`
	unicornRe := regexp.MustCompile(fmt.Sprintf(`^\s*gem %sunicorn%s`, quotes, quotes))
	scanner := bufio.NewScanner(strings.NewReader(gemfileContent))
	for scanner.Scan() {
		line := []byte(scanner.Text())
		if unicornRe.Match(line) {
			unicornFound = true
			break
		}
	}
	if unicornFound {
		results <- struct {
			string
			bool
		}{unicorn, true}
	} else {
		results <- struct {
			string
			bool
		}{unicorn, false}
	}
	runtime.wg.Done()
}

func (runtime *apiRubyRuntime) detectPassenger(gemfileContent string, results chan struct {
	string
	bool
}) {
	passengerFound := false
	quotes := `["']`
	passengerRe := regexp.MustCompile(fmt.Sprintf(`^\s*gem %spassenger%s`, quotes, quotes))
	scanner := bufio.NewScanner(strings.NewReader(gemfileContent))
	for scanner.Scan() {
		line := []byte(scanner.Text())
		if passengerRe.Match(line) {
			passengerFound = true
			break
		}
	}
	if passengerFound {
		results <- struct {
			string
			bool
		}{passenger, true}
	} else {
		results <- struct {
			string
			bool
		}{passenger, false}
	}
	runtime.wg.Done()
}

func (runtime *apiRubyRuntime) detectRackup(
	client *github.Client, owner, name string,
	repoContentOptions github.RepositoryContentGetOptions, results chan struct {
		string
		bool
	},
) {
	fileContent, _, _, err := client.Repositories.GetContents(context.Background(),
		owner, name, "Gemfile.lock", &repoContentOptions)
	if err != nil {
		fmt.Printf("Error fetching contents of Gemfile.lock for %s/%s: %v\n", owner, name, err)
		runtime.wg.Done()
		return
	}
	gemfileLockContent, err := fileContent.GetContent()
	if err != nil {
		fmt.Printf("Error calling GetContent() on Gemfile.lock for %s/%s: %v\n", owner, name, err)
		runtime.wg.Done()
		return
	}

	rackFound := false
	scanner := bufio.NewScanner(strings.NewReader(gemfileLockContent))
	for scanner.Scan() {
		if strings.TrimSpace(scanner.Text()) == "GEM" {
			for scanner.Scan() {
				if strings.Contains(scanner.Text(), "rack") {
					rackFound = true
					break
				}
			}
		}
	}
	if rackFound {
		results <- struct {
			string
			bool
		}{rackup, true}
	} else {
		results <- struct {
			string
			bool
		}{rackup, false}
	}
	runtime.wg.Done()
}

func (runtime *apiRubyRuntime) detectRake(gemfileContent string, results chan struct {
	string
	bool
}) {
	rakeFound := false
	quotes := `["']`
	rakeRe := regexp.MustCompile(fmt.Sprintf(`^\s*gem %srake%s`, quotes, quotes))
	scanner := bufio.NewScanner(strings.NewReader(gemfileContent))
	for scanner.Scan() {
		line := []byte(scanner.Text())
		if rakeRe.Match(line) {
			rakeFound = true
			break
		}
	}
	if rakeFound {
		results <- struct {
			string
			bool
		}{rake, true}
	} else {
		results <- struct {
			string
			bool
		}{rake, false}
	}
	runtime.wg.Done()
}

func (runtime *apiRubyRuntime) Detect(
	client *github.Client,
	directoryContent []*github.RepositoryContent,
	owner, name, path string,
	repoContentOptions github.RepositoryContentGetOptions,
) *RuntimeResponse {
	runtime.packs = populateRubyPacks(client)

	gemfileFound := false
	gemfileLockFound := false
	configRuFound := false
	rakefileFound := false
	for i := range directoryContent {
		name := directoryContent[i].GetName()
		if name == "Gemfile" {
			gemfileFound = true
		} else if name == "Gemfile.lock" {
			gemfileLockFound = true
		} else if name == "config.ru" {
			configRuFound = true
		} else if name == "Rakefile" || name == "Rakefile.rb" || name == "rakefile" || name == "rakefile.rb" {
			rakefileFound = true
		}
	}

	if !gemfileFound {
		fmt.Printf("No Ruby runtime detected for %s/%s\n", owner, name)
		return nil
	}

	fileContent, _, _, err := client.Repositories.GetContents(context.Background(), owner, name, "Gemfile", &repoContentOptions)
	if err != nil {
		fmt.Printf("Error fetching contents of Gemfile for %s/%s: %v\n", owner, name, err)
		return nil
	}
	gemfileContent, err := fileContent.GetContent()
	if err != nil {
		fmt.Printf("Error calling GetContent() on Gemfile for %s/%s: %v\n", owner, name, err)
		return nil
	}

	count := 6
	if !configRuFound {
		// unicorn needs config.ru
		count -= 1
		if !gemfileLockFound {
			// rackup needs one of Gemfile.lock or config.ru
			count -= 1
		}
	}
	if !rakefileFound {
		count -= 1
	}
	results := make(chan struct {
		string
		bool
	}, count)

	fmt.Printf("Starting detection for a Ruby runtime for %s/%s\n", owner, name)
	runtime.wg.Add(count)
	fmt.Println("Checking for puma")
	go runtime.detectPuma(gemfileContent, results)
	fmt.Println("Checking for thin")
	go runtime.detectThin(gemfileContent, results)
	if configRuFound {
		{
			// FIXME: find a better, more readable way of doing this
			fmt.Printf("Ruby rackup runtime detected for %s/%s\n", owner, name)
			results <- struct {
				string
				bool
			}{rackup, true}
			runtime.wg.Done()
		}

		fmt.Println("Checking for unicorn")
		runtime.detectUnicorn(gemfileContent, results)
	}
	fmt.Println("Checking for passenger")
	go runtime.detectPassenger(gemfileContent, results)
	if !configRuFound && gemfileLockFound {
		fmt.Println("Checking for rackup")
		go runtime.detectRackup(client, owner, name, repoContentOptions, results)
	}
	if rakefileFound {
		fmt.Println("Checking for rake")
		runtime.detectRake(gemfileContent, results)
	}
	runtime.wg.Wait()
	close(results)

	detected := make(map[string]bool)
	for result := range results {
		detected[result.string] = result.bool
	}

	// TODO: how to access config values for Ruby projects
	if found, ok := detected[puma]; ok && found {
		fmt.Printf("Ruby puma runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Ruby",
			Runtime:    puma,
			Buildpacks: runtime.packs[puma],
		}
	} else if found, ok := detected[thin]; ok && found {
		fmt.Printf("Ruby thin runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Ruby",
			Runtime:    thin,
			Buildpacks: runtime.packs[thin],
		}
	} else if found, ok := detected[unicorn]; ok && found {
		fmt.Printf("Ruby unicorn runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Ruby",
			Runtime:    unicorn,
			Buildpacks: runtime.packs[unicorn],
		}
	} else if found, ok := detected[passenger]; ok && found {
		fmt.Printf("Ruby passenger runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Ruby",
			Runtime:    passenger,
			Buildpacks: runtime.packs[passenger],
		}
	} else if found, ok := detected[rackup]; ok && found {
		fmt.Printf("Ruby rackup runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Ruby",
			Runtime:    rackup,
			Buildpacks: runtime.packs[rackup],
		}
	} else if found, ok := detected[rake]; ok && found {
		fmt.Printf("Ruby rake runtime detected for %s/%s\n", owner, name)
		return &RuntimeResponse{
			Name:       "Ruby",
			Runtime:    rake,
			Buildpacks: runtime.packs[rake],
		}
	}

	panic("[api_ruby.go] This should ne never reached")
}
