package jobs

type HelmReleaseTracker struct{}

func (t *HelmReleaseTracker) ID() string {
	return "helm-release-tracker"
}

func (t *HelmReleaseTracker) Run() error {
	return nil
}
