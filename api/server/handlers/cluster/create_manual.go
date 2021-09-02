package cluster

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"regexp"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type CreateClusterManualHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateClusterManualHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateClusterManualHandler {
	return &CreateClusterManualHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreateClusterManualHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project from context
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateClusterManualRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	cluster, err := getClusterModelFromManualRequest(c.Repo(), proj, request)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	cluster, err = c.Repo().Cluster().CreateCluster(cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, cluster.ToClusterType())
}

func getClusterModelFromManualRequest(
	repo repository.Repository,
	project *models.Project,
	request *types.CreateClusterManualRequest,
) (*models.Cluster, error) {
	var authMechanism models.ClusterAuth

	if request.GCPIntegrationID != 0 {
		authMechanism = models.GCP

		// check that the integration exists
		_, err := repo.GCPIntegration().ReadGCPIntegration(project.ID, request.GCPIntegrationID)

		if err != nil {
			return nil, fmt.Errorf("gcp integration not found")
		}
	} else if request.AWSIntegrationID != 0 {
		authMechanism = models.AWS

		// check that the integration exists
		_, err := repo.AWSIntegration().ReadAWSIntegration(project.ID, request.AWSIntegrationID)

		if err != nil {
			return nil, fmt.Errorf("aws integration not found")
		}
	} else {
		return nil, fmt.Errorf("must include aws or gcp integration id")
	}

	cert := make([]byte, 0)

	if request.CertificateAuthorityData != "" {
		// determine if data is base64 decoded using regex
		re := regexp.MustCompile(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`)

		// if it matches the base64 regex, decode it
		if re.MatchString(request.CertificateAuthorityData) {
			decoded, err := base64.StdEncoding.DecodeString(request.CertificateAuthorityData)

			if err != nil {
				return nil, err
			}

			cert = []byte(decoded)
		}
	}

	return &models.Cluster{
		ProjectID:                project.ID,
		AuthMechanism:            authMechanism,
		Name:                     request.Name,
		Server:                   request.Server,
		GCPIntegrationID:         request.GCPIntegrationID,
		AWSIntegrationID:         request.AWSIntegrationID,
		CertificateAuthorityData: cert,
	}, nil
}
