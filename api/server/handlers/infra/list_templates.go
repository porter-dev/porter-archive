package infra

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type InfraListTemplateHandler struct {
	handlers.PorterHandlerWriter
}

func NewInfraListTemplateHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *InfraListTemplateHandler {
	return &InfraListTemplateHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *InfraListTemplateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	res := make([]types.InfraTemplateMeta, 0)

	for _, val := range templateMap {
		res = append(res, *val)
	}

	c.WriteResult(w, r, res)
}

var templateMap = map[string]*types.InfraTemplateMeta{
	"test": {
		Icon:               "",
		Description:        "Create a test resource.",
		Name:               "Test",
		Version:            "v0.1.0",
		Kind:               "test",
		RequiredCredential: "do_integration_id",
	},
	"ecr": {
		Icon:               "https://avatars2.githubusercontent.com/u/52505464?s=400&u=da920f994c67665c7ad6c606a5286557d4f8555f&v=4",
		Description:        "Create an Elastic Container Registry.",
		Name:               "ECR",
		Version:            "v0.1.0",
		Kind:               "ecr",
		RequiredCredential: "aws_integration_id",
	},
	"rds": {
		Icon:               "",
		Description:        "Create a Relational Database Service instance.",
		Name:               "RDS",
		Version:            "v0.1.0",
		Kind:               "rds",
		RequiredCredential: "aws_integration_id",
	},
	"s3": {
		Icon:               "",
		Description:        "Create an S3 bucket.",
		Name:               "S3",
		Version:            "v0.1.0",
		Kind:               "s3",
		RequiredCredential: "aws_integration_id",
	},
	"eks": {
		Icon:               "https://img.stackshare.io/service/7991/amazon-eks.png",
		Description:        "Create an Elastic Kubernetes Service cluster.",
		Name:               "EKS",
		Version:            "v0.1.0",
		Kind:               "eks",
		RequiredCredential: "aws_integration_id",
	},
	"gcr": {
		Icon:               "https://carlossanchez.files.wordpress.com/2019/06/21046548.png?w=640",
		Description:        "Create a Google Container Registry.",
		Name:               "GCR",
		Version:            "v0.1.0",
		Kind:               "gcr",
		RequiredCredential: "gcp_integration_id",
	},
	"gar": {
		Icon:               "https://carlossanchez.files.wordpress.com/2019/06/21046548.png?w=640",
		Description:        "Create a Google Artifact Registry.",
		Name:               "GAR",
		Version:            "v0.1.0",
		Kind:               "gar",
		RequiredCredential: "gcp_integration_id",
	},
	"gke": {
		Icon:               "https://sysdig.com/wp-content/uploads/2016/08/GKE_color.png",
		Description:        "Create a Google Kubernetes Engine cluster.",
		Name:               "GKE",
		Version:            "v0.1.0",
		Kind:               "gke",
		RequiredCredential: "gcp_integration_id",
	},
	"docr": {
		Icon:               "",
		Description:        "Create a Digital Ocean Container Registry.",
		Name:               "DOCR",
		Version:            "v0.1.0",
		Kind:               "docr",
		RequiredCredential: "do_integration_id",
	},
	"doks": {
		Icon:               "",
		Description:        "Create a Digital Ocean Kubernetes Service cluster.",
		Name:               "DOKS",
		Version:            "v0.1.0",
		Kind:               "doks",
		RequiredCredential: "do_integration_id",
	},
	"acr": {
		Icon:               "",
		Description:        "Create an Azure Container Registry.",
		Name:               "ACR",
		Version:            "v0.1.0",
		Kind:               "acr",
		RequiredCredential: "azure_integration_id",
	},
	"aks": {
		Icon:               "",
		Description:        "Create an Azure Kubernetes Service cluster",
		Name:               "AKS",
		Version:            "v0.1.0",
		Kind:               "aks",
		RequiredCredential: "azure_integration_id",
	},
}
