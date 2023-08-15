package preview

import (
	"fmt"
	"strings"
)

func sanitizedRepoSuffix(repoOwner, repoName string) string {
	initialSuffix := fmt.Sprintf("%s-%s", repoOwner, repoName)
	sanitizedSuffix := strings.ReplaceAll(strings.ReplaceAll(initialSuffix, "_", "-"), ".", "-")
	return strings.ToLower(sanitizedSuffix)
}
