package utils

import (
	"fmt"
	"strings"
)

func SanitizedRepoSuffix(repoOwner, repoName string) string {
	initialSuffix := fmt.Sprintf("%s-%s", repoOwner, repoName)
	sanitizedSuffix := strings.ReplaceAll(strings.ReplaceAll(initialSuffix, "_", "-"), ".", "-")
	return strings.ToLower(sanitizedSuffix)
}
