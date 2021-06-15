package deploy

// SharedOpts are common options for build, create, and deploy agents
type SharedOpts struct {
	ProjectID       uint
	ClusterID       uint
	Namespace       string
	LocalPath       string
	LocalDockerfile string
	OverrideTag     string
	Method          DeployBuildType
}
