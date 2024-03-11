package porter_app

import (
	"fmt"
	"net/http"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetCloudSqlSecretHandler is a handler to get the cloudsql secret
type GetCloudSqlSecretHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewGetCloudSqlSecretHandler returns a GetCloudSqlSecretHandler
func NewGetCloudSqlSecretHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetCloudSqlSecretHandler {
	return &GetCloudSqlSecretHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// GetCloudSqlSecretResponse is the response payload for the GetCloudSqlSecretHandler
type GetCloudSqlSecretResponse struct {
	SecretName string `json:"secret_name"`
}

// ServeHTTP retrieves the cloudsql secret
func (c *GetCloudSqlSecretHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	ctx, span := telemetry.NewSpan(ctx, "serve-get-cloudsql-secret")
	defer span.End()

	deploymentTarget, _ := ctx.Value(types.DeploymentTargetScope).(types.DeploymentTarget)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "application-name", Value: appName})

	cluster, err := c.Repo().Cluster().ReadCluster(deploymentTarget.ProjectID, deploymentTarget.ClusterID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading cluster")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	agent, err := c.GetAgent(r, cluster, deploymentTarget.Namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	secret, err := agent.GetSecret(fmt.Sprintf("cloudsql-secret-%s", appName), deploymentTarget.Namespace)
	if err != nil && !k8serrors.IsNotFound(err) {
		err = telemetry.Error(ctx, span, err, "error getting secret")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	var secretName string
	if secret != nil {
		secretName = secret.Name
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "secret-name", Value: secretName})

	c.WriteResult(w, r, GetCloudSqlSecretResponse{SecretName: secretName})
}

// CreateCloudSqlSecretHandler is a handler to create the cloudsql secret
type CreateCloudSqlSecretHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

// NewCreateCloudSqlSecretHandler returns a CreateCloudSqlSecretHandler
func NewCreateCloudSqlSecretHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateCloudSqlSecretHandler {
	return &CreateCloudSqlSecretHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

// CreateCloudSqlSecretRequest is the request payload for the CreateCloudSqlSecretHandler
type CreateCloudSqlSecretRequest struct {
	B64ServiceAccountJson string `json:"b64_service_account_json"`
}

// ServeHTTP creates the cloudsql secret
func (c *CreateCloudSqlSecretHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	ctx, span := telemetry.NewSpan(ctx, "serve-create-cloudsql-secret")
	defer span.End()

	deploymentTarget, _ := ctx.Value(types.DeploymentTargetScope).(types.DeploymentTarget)

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "error parsing porter app name")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "application-name", Value: appName})

	request := &CreateCloudSqlSecretRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	cluster, err := c.Repo().Cluster().ReadCluster(deploymentTarget.ProjectID, deploymentTarget.ClusterID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error reading cluster")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	agent, err := c.GetAgent(r, cluster, deploymentTarget.Namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting agent")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	secret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name: fmt.Sprintf("cloudsql-secret-%s", appName),
		},
		Data: map[string][]byte{
			"service_account.json": []byte(request.B64ServiceAccountJson),
		},
	}

	_, err = agent.CreateSecret(secret, deploymentTarget.Namespace)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating secret")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
}
