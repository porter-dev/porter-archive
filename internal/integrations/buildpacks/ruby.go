package buildpacks

import (
	"bufio"
	"context"
	"fmt"
	"regexp"
	"strings"
	"sync"

	"github.com/google/go-github/v41/github"
	"github.com/xanzy/go-gitlab"
)

type rubyRuntime struct {
	wg sync.WaitGroup
}

func NewRubyRuntime() Runtime {
	return &rubyRuntime{}
}

func (runtime *rubyRuntime) detectPuma(gemfileContent string, results chan struct {
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
	}
	runtime.wg.Done()
}

func (runtime *rubyRuntime) detectThin(gemfileContent string, results chan struct {
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
	}
	runtime.wg.Done()
}

func (runtime *rubyRuntime) detectUnicorn(gemfileContent string, results chan struct {
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
	}
	runtime.wg.Done()
}

func (runtime *rubyRuntime) detectPassenger(gemfileContent string, results chan struct {
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
	}
	runtime.wg.Done()
}

func (runtime *rubyRuntime) detectRackupGithub(
	client *github.Client, owner, name string,
	repoContentOptions github.RepositoryContentGetOptions, results chan struct {
		string
		bool
	},
) {
	fileContent, _, _, err := client.Repositories.GetContents(context.Background(),
		owner, name, "Gemfile.lock", &repoContentOptions)
	if err != nil {
		runtime.wg.Done()
		return
	}
	gemfileLockContent, err := fileContent.GetContent()
	if err != nil {
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
	}
	runtime.wg.Done()
}

func (runtime *rubyRuntime) detectRackupGitlab(
	client *gitlab.Client, owner, name, ref string, results chan struct {
		string
		bool
	},
) {
	fileContent, _, err := client.RepositoryFiles.GetRawFile(
		fmt.Sprintf("%s/%s", owner, name), "Gemfile.lock", &gitlab.GetRawFileOptions{
			Ref: gitlab.String(ref),
		})
	if err != nil {
		runtime.wg.Done()
		return
	}
	gemfileLockContent := string(fileContent)

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
	}
	runtime.wg.Done()
}

func (runtime *rubyRuntime) detectRake(gemfileContent string, results chan struct {
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
	}
	runtime.wg.Done()
}

func (runtime *rubyRuntime) DetectGithub(
	client *github.Client,
	directoryContent []*github.RepositoryContent,
	owner, name, path string,
	repoContentOptions github.RepositoryContentGetOptions,
	paketo, heroku *BuilderInfo,
) error {
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

	paketoBuildpackInfo := BuildpackInfo{
		Name:      "Ruby",
		Buildpack: "gcr.io/paketo-buildpacks/ruby",
	}
	herokuBuildpackInfo := BuildpackInfo{
		Name:      "Ruby",
		Buildpack: "heroku/ruby",
	}

	if !gemfileFound {
		paketo.Others = append(paketo.Others, paketoBuildpackInfo)
		heroku.Others = append(heroku.Others, herokuBuildpackInfo)
		return nil
	}

	fileContent, _, _, err := client.Repositories.GetContents(context.Background(), owner, name, "Gemfile", &repoContentOptions)
	if err != nil {
		paketo.Others = append(paketo.Others, paketoBuildpackInfo)
		heroku.Others = append(heroku.Others, herokuBuildpackInfo)
		return fmt.Errorf("error fetching contents of Gemfile for %s/%s: %v", owner, name, err)
	}
	gemfileContent, err := fileContent.GetContent()
	if err != nil {
		paketo.Others = append(paketo.Others, paketoBuildpackInfo)
		heroku.Others = append(heroku.Others, herokuBuildpackInfo)
		return fmt.Errorf("error calling GetContent() on Gemfile for %s/%s: %v", owner, name, err)
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

	runtime.wg.Add(count)
	go runtime.detectPuma(gemfileContent, results)
	go runtime.detectThin(gemfileContent, results)
	if configRuFound {
		{
			// FIXME: find a better, more readable way of doing this
			results <- struct {
				string
				bool
			}{rackup, true}
			runtime.wg.Done()
		}

		go runtime.detectUnicorn(gemfileContent, results)
	}
	go runtime.detectPassenger(gemfileContent, results)
	if !configRuFound && gemfileLockFound {
		go runtime.detectRackupGithub(client, owner, name, repoContentOptions, results)
	}
	if rakefileFound {
		go runtime.detectRake(gemfileContent, results)
	}
	runtime.wg.Wait()
	close(results)

	paketo.Detected = append(paketo.Detected, paketoBuildpackInfo)
	heroku.Detected = append(heroku.Detected, herokuBuildpackInfo)

	return nil
}

func (runtime *rubyRuntime) DetectGitlab(
	client *gitlab.Client,
	tree []*gitlab.TreeNode,
	owner, name, path, ref string,
	paketo, heroku *BuilderInfo,
) error {
	gemfileFound := false
	gemfileLockFound := false
	configRuFound := false
	rakefileFound := false
	for i := range tree {
		name := tree[i].Name
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

	paketoBuildpackInfo := BuildpackInfo{
		Name:      "Ruby",
		Buildpack: "gcr.io/paketo-buildpacks/ruby",
	}
	herokuBuildpackInfo := BuildpackInfo{
		Name:      "Ruby",
		Buildpack: "heroku/ruby",
	}

	if !gemfileFound {
		paketo.Others = append(paketo.Others, paketoBuildpackInfo)
		heroku.Others = append(heroku.Others, herokuBuildpackInfo)
		return nil
	}

	fileContent, _, err := client.RepositoryFiles.GetRawFile(
		fmt.Sprintf("%s/%s", owner, name), "Gemfile", &gitlab.GetRawFileOptions{
			Ref: gitlab.String(ref),
		})
	if err != nil {
		paketo.Others = append(paketo.Others, paketoBuildpackInfo)
		heroku.Others = append(heroku.Others, herokuBuildpackInfo)
		return fmt.Errorf("error fetching contents of Gemfile for %s/%s: %v", owner, name, err)
	}
	gemfileContent := string(fileContent)

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

	runtime.wg.Add(count)
	go runtime.detectPuma(gemfileContent, results)
	go runtime.detectThin(gemfileContent, results)
	if configRuFound {
		{
			// FIXME: find a better, more readable way of doing this
			results <- struct {
				string
				bool
			}{rackup, true}
			runtime.wg.Done()
		}

		go runtime.detectUnicorn(gemfileContent, results)
	}
	go runtime.detectPassenger(gemfileContent, results)
	if !configRuFound && gemfileLockFound {
		go runtime.detectRackupGitlab(client, owner, name, ref, results)
	}
	if rakefileFound {
		go runtime.detectRake(gemfileContent, results)
	}
	runtime.wg.Wait()
	close(results)

	paketo.Detected = append(paketo.Detected, paketoBuildpackInfo)
	heroku.Detected = append(heroku.Detected, herokuBuildpackInfo)

	return nil
}
