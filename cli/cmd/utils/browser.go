package utils

import (
	"os/exec"
	"regexp"
	"runtime"
)

func checkIfWsl() bool {
	out, err := exec.Command("uname", "-a").Output()
	if err != nil {
		return false
	}
	// On some cases, uname on wsl outputs microsoft capitalized
	if matched, err := regexp.Match(`microsoft|Microsoft`, out); err != nil {
		return matched
	}
	return false
}

// OpenBrowser opens the specified URL in the default browser of the user.
func OpenBrowser(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default: // "linux", "freebsd", "openbsd", "netbsd"
		if checkIfWsl() {
			cmd = "explorer.exe"
		} else {
			cmd = "xdg-open"
		}
	}
	args = append(args, url)
	return exec.Command(cmd, args...).Start()
}
