package porter_app

// TODO: migrate all kubernetes-level operations from /api/server/handlers/porter_app/{create,parse}.go to this file

const (
	LabelKey_PorterApplication          = "porter.run/porter-application"
	LabelKey_PorterApplicationPreDeploy = "porter.run/porter-application-pre-deploy"
	LabelValue_PorterApplication        = "true"
)
