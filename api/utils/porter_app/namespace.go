package porter_app

import (
	"fmt"
	"strings"
)

func NamespaceFromPorterAppName(porterAppName string) string {
	return fmt.Sprintf("porter-stack-%s", porterAppName)
}

func PorterAppNameFromNamespace(namespace string) string {
	return strings.TrimPrefix(namespace, "porter-stack-")
}

func PredeployJobNameFromPorterAppName(porterAppName string) string {
	return fmt.Sprintf("%s-r", porterAppName)
}
