package integrations

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	smithyhttp "github.com/aws/smithy-go/transport/http"
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// AWSIntegration is an auth mechanism that uses a AWS IAM user to
// authenticate
type AWSIntegration struct {
	gorm.Model

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The AWS arn this is integration is linked to
	AWSArn string `json:"aws_arn"`

	// The optional AWS region (required by some session configurations)
	AWSRegion string `json:"aws_region"`

	// The assumed role ARN to use for sessions
	AWSAssumeRoleArn string

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------

	// The AWS cluster ID
	// See https://github.com/kubernetes-sigs/aws-iam-authenticator#what-is-a-cluster-id
	AWSClusterID []byte `json:"aws_cluster_id"`

	// The AWS access key for this IAM user
	AWSAccessKeyID []byte `json:"aws_access_key_id"`

	// The AWS secret key for this IAM user
	AWSSecretAccessKey []byte `json:"aws_secret_access_key"`

	// An optional session token, if the user is assuming a role
	AWSSessionToken []byte `json:"aws_session_token"`
}

func (a *AWSIntegration) ToAWSIntegrationType() types.AWSIntegration {
	return types.AWSIntegration{
		CreatedAt: a.CreatedAt,
		ID:        a.ID,
		UserID:    a.UserID,
		ProjectID: a.ProjectID,
		AWSArn:    a.AWSArn,
	}
}

// Config returns a populated AWS Config for use with aws-go-sdk-v2 services
func (a *AWSIntegration) Config() aws.Config {
	awsConf := aws.Config{
		Credentials: credentials.NewStaticCredentialsProvider(
			*aws.String(string(a.AWSAccessKeyID)),
			*aws.String(string(a.AWSSecretAccessKey)),
			*aws.String(string(a.AWSSessionToken)),
		),
	}

	if a.AWSRegion != "" {
		awsConf.Region = a.AWSRegion
	}

	return awsConf
}

// PopulateAWSArn uses the access key/secret to get the caller identity, and
// attaches it to the AWS integration
func (a *AWSIntegration) PopulateAWSArn(ctx context.Context) error {
	svc := sts.NewFromConfig(a.Config())

	result, err := svc.GetCallerIdentity(ctx, &sts.GetCallerIdentityInput{})

	if err != nil {
		return err
	}

	a.AWSArn = *result.Arn

	return nil
}

// GetBearerToken retrieves a bearer token for an AWS account
func (a *AWSIntegration) GetBearerToken(
	ctx context.Context,
	getTokenCache GetTokenCacheFunc,
	setTokenCache SetTokenCacheFunc,
	clusterID string,
	shouldClusterIdOverride bool,
) (string, error) {
	cache, err := getTokenCache()

	// check the token cache for a non-expired token
	if cache != nil {
		if tok := cache.Token; err == nil && !cache.IsExpired() && len(tok) > 0 {
			return string(tok), nil
		}
	}

	var validClusterId string

	if shouldClusterIdOverride {
		validClusterId = clusterID
	} else {
		validClusterId = string(a.AWSClusterID)

		if validClusterId == "" {
			validClusterId = clusterID
		}
	}

	token, err := a.GetWithSTS(ctx, clusterID)
	if err != nil {
		return "", err
	}

	setTokenCache(token.Token, token.Expiration)

	return token.Token, nil
}

// Token is generated and used by Kubernetes client-go to authenticate with a Kubernetes cluster.
// Original source: https://github.com/weaveworks/eksctl/blob/5f2a59056a4852470c66502205d2db0aa7c84c5e/pkg/eks/auth/generator.go#LL46C24-L46C24
type Token struct {
	Token      string
	Expiration time.Time
}

const (
	clusterIDHeader        = "x-k8s-aws-id"
	presignedURLExpiration = 10 * time.Minute
	v1Prefix               = "k8s-aws-v1."
)

// GetWithSTS returns a token valid for clusterID using the given STS client.
// This implementation follows the steps outlined here:
// https://github.com/kubernetes-sigs/aws-iam-authenticator#api-authorization-from-outside-a-cluster
// We either add this implementation or have to maintain two versions of STS since aws-iam-authenticator is
// not switching over to aws-go-sdk-v2.
func (a AWSIntegration) GetWithSTS(ctx context.Context, clusterID string) (Token, error) {
	presignClient := sts.NewPresignClient(sts.NewFromConfig(a.Config()))
	// generate a sts:GetCallerIdentity request and add our custom cluster ID header
	presignedURLRequest, err := presignClient.PresignGetCallerIdentity(ctx, &sts.GetCallerIdentityInput{}, func(presignOptions *sts.PresignOptions) {
		presignOptions.ClientOptions = append(presignOptions.ClientOptions, a.appendPresignHeaderValuesFunc(clusterID))
	})
	if err != nil {
		return Token{}, fmt.Errorf("failed to presign caller identity: %w", err)
	}

	tokenExpiration := time.Now().Local().Add(presignedURLExpiration)
	// Add the token with k8s-aws-v1. prefix.
	return Token{v1Prefix + base64.RawURLEncoding.EncodeToString([]byte(presignedURLRequest.URL)), tokenExpiration}, nil
}

func (a AWSIntegration) appendPresignHeaderValuesFunc(clusterID string) func(stsOptions *sts.Options) {
	return func(stsOptions *sts.Options) {
		// Add clusterId Header
		stsOptions.APIOptions = append(stsOptions.APIOptions, smithyhttp.SetHeaderValue(clusterIDHeader, clusterID))
		// Add X-Amz-Expires query param
		stsOptions.APIOptions = append(stsOptions.APIOptions, smithyhttp.SetHeaderValue("X-Amz-Expires", "60"))
	}
}
