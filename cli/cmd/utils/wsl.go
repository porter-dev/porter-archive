package utils

import (
	"os/exec"
	"regexp"
	"strings"
)

// Checks based on uname if the linux environment is under wsl or not
func CheckIfWsl() bool {
	out, err := exec.Command("uname", "-a").Output()
	if err != nil {
		return false
	}
	// On some cases, uname on wsl outputs microsoft capitalized
	matched, _ := regexp.Match(`microsoft|Microsoft`, out)
	return matched
}

// Gets the subsystem host ip
// If the CLI is running under WSL the localhost url will not work so
// this function should return the real ip that we should redirect to
func GetWslHostName() string {
	out, err := exec.Command("wsl.exe", "hostname", "-I").Output()
	if err != nil {
		return "localhost"
	}
	return strings.TrimSpace(string(out))
}
