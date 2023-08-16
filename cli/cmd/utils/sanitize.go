package utils

import (
	"fmt"
	"strings"
)

// SanitizedRepoSuffix return a sanitized repository name based on a Git repo owner and name.
func SanitizedRepoSuffix(repoOwner, repoName string) string {
	initialSuffix := fmt.Sprintf("%s-%s", repoOwner, repoName)
	sanitizedSuffix := strings.ReplaceAll(strings.ReplaceAll(initialSuffix, "_", "-"), ".", "-")
	return strings.ToLower(sanitizedSuffix)
}
