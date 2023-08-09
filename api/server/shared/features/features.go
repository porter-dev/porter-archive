package features

import (
	"strconv"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers/cluster"
	"github.com/porter-dev/porter/internal/kubernetes"
)

// isPorterAgentUpdated checks if the agent version is at least the version specified by the major, minor, and patch arguments
func isPorterAgentUpdated(agent *kubernetes.Agent, major, minor, patch int) bool {
	res, err := cluster.GetAgentVersionResponse(agent)
	if err != nil {
		return false
	}
	image := res.Image
	parsed := strings.Split(image, ":")

	if len(parsed) != 2 {
		return false
	}

	tag := parsed[1]
	if tag == "dev" {
		return true
	}

	// check if 'v' is a prefix
	if !strings.HasPrefix(tag, "v") {
		return false
	}

	tag = strings.TrimPrefix(tag, "v")
	parsedTag := strings.Split(tag, ".")
	if len(parsedTag) != 3 {
		return false
	}

	parsedMajor, _ := strconv.Atoi(parsedTag[0])
	parsedMinor, _ := strconv.Atoi(parsedTag[1])
	parsedPatch, _ := strconv.Atoi(parsedTag[2])
	if parsedMajor < major {
		return false
	}
	if parsedMinor < minor {
		return false
	}
	if parsedPatch < patch {
		return false
	}
	return true
}

// Only create the PROGRESSING event if the cluster's agent is updated, because only the updated agent can update the status
// TODO: remove dependence on porter email once we are ready to release this feature
func AreAgentDeployEventsEnabled(email string, agent *kubernetes.Agent) bool {
	return isPorterAgentUpdated(agent, 3, 1, 6) && strings.HasSuffix(email, "porter.run")
}
