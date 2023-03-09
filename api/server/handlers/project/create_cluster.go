package project

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/nats-io/nats.go"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"google.golang.org/protobuf/proto"
)

type CreateClusterHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProvisionClusterHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateClusterHandler {
	return &CreateClusterHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP creates a CAPI cluster by adding the configuration to a NATS stream
// This inserts a row into the cluster table in order to create an ID for this cluster, as well as stores the raw request JSON for updating later
func (c *CreateClusterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var capiClusterReq types.CAPIClusterRequest
	ctx := r.Context()

	if ok := c.DecodeAndValidate(w, r, &capiClusterReq); !ok {
		return
	}

	if capiClusterReq.ClusterID == 0 {
		dbCluster := models.Cluster{
			ProjectID:                         uint(capiClusterReq.ProjectID),
			Status:                            types.UpdatingUnavailable,
			ProvisionedBy:                     "CAPI",
			CloudProvider:                     "AWS",
			CloudProviderCredentialIdentifier: capiClusterReq.CloudProviderCredentialsID,
			Name:                              capiClusterReq.ClusterSettings.ClusterName,
		}
		cl, err := c.Config().Repo.Cluster().CreateCluster(&dbCluster)
		if err != nil {
			e := fmt.Errorf("error creating new cluster: %w", err)
			c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}
		capiClusterReq.ClusterID = int64(cl.ID)
	}

	by, err := json.Marshal(capiClusterReq)
	if err != nil {
		e := fmt.Errorf("error marshalling capi config: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}
	b64 := base64.StdEncoding.EncodeToString(by)

	capiConfig := models.CAPIConfig{
		ClusterID:         int(capiClusterReq.ClusterID),
		ProjectID:         int(capiClusterReq.ProjectID),
		Base64RequestJSON: string(b64),
	}

	_, err = c.Config().Repo.CAPIConfigRepository().Insert(ctx, capiConfig)
	if err != nil {
		e := fmt.Errorf("error creating new capi config: %w", err)
		c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
		return
	}

	capiCluster := porterv1.Kubernetes{
		ProjectId: int32(capiClusterReq.ProjectID),
		ClusterId: int32(capiClusterReq.ClusterID),
	}
	if capiClusterReq.CloudProvider == "aws" {
		capiCluster.CloudProvider = porterv1.EnumCloudProvider_ENUM_CLOUD_PROVIDER_AWS
		capiCluster.Kind = porterv1.EnumKubernetesKind_ENUM_KUBERNETES_KIND_EKS
		capiCluster.CloudProviderCredentialsId = capiClusterReq.CloudProviderCredentialsID

		var capiNodeGroups []*porterv1.EKSNodeGroup
		for _, ng := range capiClusterReq.ClusterSettings.NodeGroups {
			cng := porterv1.EKSNodeGroup{
				InstanceType:  ng.InstanceType,
				MinInstances:  uint32(ng.MinInstances),
				MaxInstances:  uint32(ng.MaxInstances),
				NodeGroupType: protoNodeGroupTypeLookup(ng.NodeGroupType),
			}
			capiNodeGroups = append(capiNodeGroups, &cng)
		}

		capiCluster.KindValues = &porterv1.Kubernetes_EksKind{
			EksKind: &porterv1.EKS{
				ClusterName:    capiClusterReq.ClusterSettings.ClusterName,
				CidrRange:      capiClusterReq.ClusterSettings.CIDRRange,
				ClusterVersion: capiClusterReq.ClusterSettings.ClusterVersion,
				Region:         capiClusterReq.ClusterSettings.Region,
				NodeGroups:     capiNodeGroups,
			},
		}
	}

	// This gates the cluster actually being provisioned by CAPI
	// This can be removed whenever we are able to run NATS and CCP locally, easier
	if !c.Config().DisableCAPIProvisioner {
		kubeBy, err := proto.Marshal(&capiCluster)
		if err != nil {
			e := fmt.Errorf("error marshalling proto: %w", err)
			c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}

		subject := "porter.system.infrastructure.update"
		_, err = c.Config().NATS.JetStream.Publish(subject, kubeBy, nats.Context(ctx))
		if err != nil {
			e := fmt.Errorf("error publishing cluster for creation: %w", err)
			c.HandleAPIError(w, r, apierrors.NewErrInternal(e))
			return
		}
	}

	w.WriteHeader(http.StatusCreated)
	c.WriteResult(w, r, types.Cluster{
		ID: uint(capiClusterReq.ClusterID),
	})

}

var (
	apiNodeGroupToProtoNodeGroup = map[string]porterv1.NodeGroupType{
		"SYSTEM":      porterv1.NodeGroupType_NODE_GROUP_TYPE_SYSTEM,
		"MONITORING":  porterv1.NodeGroupType_NODE_GROUP_TYPE_MONITORING,
		"APPLICATION": porterv1.NodeGroupType_NODE_GROUP_TYPE_APPLICATION,
		"CUSTOM":      porterv1.NodeGroupType_NODE_GROUP_TYPE_CUSTOM,
	}
)

// protoNodeGroupTypeLookup is a helper function for finding a nodegroup, and returning a default if its not found
func protoNodeGroupTypeLookup(apiNodeGroup string) porterv1.NodeGroupType {
	if ngt, ok := apiNodeGroupToProtoNodeGroup[apiNodeGroup]; ok {
		return ngt
	}
	return porterv1.NodeGroupType_NODE_GROUP_TYPE_CUSTOM
}
