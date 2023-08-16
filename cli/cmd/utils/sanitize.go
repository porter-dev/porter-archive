package utils

import (
	"fmt"
	"strings"
)

// SlugifyRepoSuffix return a sanitized repository name based on a Git repo owner and name.
func SlugifyRepoSuffix(repoOwner, repoName string) string {
	initialSuffix := fmt.Sprintf("%s-%s", repoOwner, repoName)
	sanitizedSuffix := strings.ReplaceAll(strings.ReplaceAll(initialSuffix, "_", "-"), ".", "-")
	return strings.ToLower(sanitizedSuffix)
}
