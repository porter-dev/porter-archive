package api_contract

import (
	"fmt"
	"net/http"

	"github.com/bufbuild/connect-go"
	"github.com/google/uuid"
	helpers "github.com/porter-dev/api-contracts/generated/go/helpers"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/models"
)

type APIContractUpdateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewAPIContractUpdateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *APIContractUpdateHandler {
	return &APIContractUpdateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP parses the Porter API contract for validity, and forwards the requests for handling on to another service
// For now, this handling cluster creation only, by inserting a row into the cluster table in order to create an ID for this cluster, as well as stores the raw request JSON for updating later
func (c *APIContractUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var apiContract porterv1.Contract

	err := helpers.UnmarshalContractObjectFromReader(r.Body, &apiContract)
	if err != nil {
		e := fmt.Errorf("error parsing api contract: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}

	if c.Config().DisableCAPIProvisioner {
		// return dummy data if capi provisioner disabled
		// remove this stub when we can spin up all services locally, easily
		rev := models.APIContractRevision{
			ID:        uuid.New(),
			ClusterID: int(apiContract.Cluster.ClusterId),
			ProjectID: int(apiContract.Cluster.ProjectId),
		}
		w.WriteHeader(http.StatusCreated)
		c.WriteResult(w, r, rev)
		return
	}

	updateRequest := connect.NewRequest(&porterv1.UpdateContractRequest{
		Contract: &apiContract,
	})
	revision, err := c.Config().ClusterControlPlaneClient.UpdateContract(ctx, updateRequest)
	if err != nil {
		e := fmt.Errorf("error sending contract for update: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}

	w.WriteHeader(http.StatusCreated)
	c.WriteResult(w, r, revision)

	// if apiContract.Cluster == nil {
	// 	e := errors.New("missing cluster object")
	// 	c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
	// 	return
	// }

	// cl := apiContract.Cluster

	// if cl.CloudProviderCredentialsId == "" {
	// 	e := errors.New("missing cloud_provider_credential_identifier")
	// 	c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
	// 	return
	// }

	// if cl.GetEksKind() == nil {
	// 	e := errors.New("missing eks_kind_values")
	// 	c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
	// 	return
	// }

	// if cl.ClusterId == 0 {
	// 	dbClusterInput := models.Cluster{
	// 		ProjectID:                         uint(cl.ProjectId),
	// 		Status:                            types.UpdatingUnavailable,
	// 		ProvisionedBy:                     "CAPI",
	// 		CloudProvider:                     "AWS",
	// 		CloudProviderCredentialIdentifier: cl.CloudProviderCredentialsId,
	// 		Name:                              cl.GetEksKind().ClusterName,
	// 		VanityName:                        cl.GetEksKind().ClusterName,
	// 	}
	// 	dbCluster, err := c.Config().Repo.Cluster().CreateCluster(&dbClusterInput)
	// 	if err != nil {
	// 		e := fmt.Errorf("error creating new cluster: %w", err)
	// 		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
	// 		return
	// 	}
	// 	apiContract.Cluster.ClusterId = int32(dbCluster.ID)
	// }

	// by, err := helpers.MarshalContractObject(ctx, &apiContract)
	// if err != nil {
	// 	e := fmt.Errorf("error marshalling api contract: %w", err)
	// 	c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
	// 	return
	// }
	// b64 := base64.StdEncoding.EncodeToString([]byte(by))

	// apiContractRevision := models.APIContractRevision{
	// 	ClusterID:      int(cl.ClusterId),
	// 	ProjectID:      int(cl.ProjectId),
	// 	Base64Contract: string(b64),
	// }

	// contractRevision, err := c.Config().Repo.APIContractRevisioner().Insert(ctx, apiContractRevision)
	// if err != nil {
	// 	e := fmt.Errorf("error creating new capi config: %w", err)
	// 	c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
	// 	return
	// }

	// // This gates the cluster actually being provisioned by CAPI
	// // This can be removed whenever we are able to run NATS and CCP locally, easier
	// if !c.Config().DisableCAPIProvisioner {
	// 	resp := porterv1.ContractRevision{
	// 		ProjectId:  cl.ProjectId,
	// 		ClusterId:  cl.ClusterId,
	// 		RevisionId: contractRevision.ID.String(),
	// 	}
	// 	kubeBy, err := helpers.MarshalContractObject(ctx, &resp)
	// 	if err != nil {
	// 		e := fmt.Errorf("error marshalling api contract: %w", err)
	// 		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
	// 		return
	// 	}
	// 	subject := "porter.system.infrastructure.update"
	// 	_, err = c.Config().NATS.JetStream.Publish(subject, kubeBy, nats.Context(ctx))
	// 	if err != nil {
	// 		e := fmt.Errorf("error publishing cluster for creation: %w", err)
	// 		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
	// 		return
	// 	}
	// }

	// w.WriteHeader(http.StatusCreated)
	// c.WriteResult(w, r, contractRevision)
}
