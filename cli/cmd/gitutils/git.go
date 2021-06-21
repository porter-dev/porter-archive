package gitutils

import (
	"fmt"
	"os"
	"strings"

	"github.com/cli/cli/git"
)

func GitDirectory(fullpath string) (string, error) {
	currDir, err := os.Getwd()

	if err != nil {
		return "", fmt.Errorf("could not read current directory: %s", err.Error())
	}

	err = os.Chdir(fullpath)

	if err != nil {
		return "", nil
	}

	res, gitErr := git.ToplevelDir()

	err = os.Chdir(currDir)

	if err != nil {
		return "", err
	}

	return res, gitErr
}

func GetRemoteBranch(fullpath string) (*git.Remote, string, error) {
	var remote *git.Remote

	currDir, err := os.Getwd()

	if err != nil {
		return nil, "", fmt.Errorf("could not read current directory: %s", err.Error())
	}

	err = os.Chdir(fullpath)

	if err != nil {
		return nil, "", nil
	}

	// read the current branch
	branch, gitErr := git.CurrentBranch()

	if gitErr == nil {
		branchConf := git.ReadBranchConfig(branch)
		remoteName := "origin"

		if branchConf.RemoteName != "" {
			remoteName = branchConf.RemoteName
		}

		remotes, err := git.Remotes()

		if err != nil {
			return nil, "", err
		}

		for _, _remote := range remotes {
			if _remote.Name == remoteName {
				remote = _remote
				break
			}
		}

		if remote == nil {
			return nil, "", fmt.Errorf("remote repository not found")
		}
	}

	err = os.Chdir(currDir)

	if err != nil {
		return nil, "", err
	}

	return remote, branch, gitErr
}

func ParseGithubRemote(remote *git.Remote) (bool, string) {
	if remote == nil || remote.FetchURL == nil {
		return false, ""
	}

	if remote.FetchURL.Host != "github.com" {
		return false, ""
	}

	if !strings.Contains(remote.FetchURL.Path, ".git") {
		return false, ""
	}

	return true, strings.Trim(strings.TrimSuffix(remote.FetchURL.Path, ".git"), "/")
}
