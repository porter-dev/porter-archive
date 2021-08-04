package utils

import (
	"fmt"
	"os/exec"
	"runtime"
)

// OpenBrowser opens the specified URL in the default browser of the user.
func OpenBrowser(url string) error {
	var cmd string
	var args []string

	fmt.Printf("Attempting to open your browser. If this does not work, please navigate to: %s", url)

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default: // "linux", "freebsd", "openbsd", "netbsd"
		if CheckIfWsl() {
			cmd = "cmd.exe"
			args = []string{"/c", "start"}
		} else {
			cmd = "xdg-open"
		}
	}

	args = append(args, url)
	return exec.Command(cmd, args...).Start()
}
