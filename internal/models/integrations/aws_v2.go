package integrations

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// AWSv2Integration is an auth mechanism that uses a AWS IAM user to
// authenticate
type AWSv2Integration struct {
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

func (a *AWSv2Integration) ToAWSv2IntegrationType() types.AWSIntegration {
	return types.AWSIntegration{
		CreatedAt: a.CreatedAt,
		ID:        a.ID,
		UserID:    a.UserID,
		ProjectID: a.ProjectID,
		AWSArn:    a.AWSArn,
	}
}

// GetSession retrieves an AWS session to use based on the access key and secret
// access key
func (a *AWSv2Integration) GetSession() (*session.Session, error) {
	awsConf := aws.Config{
		Credentials: credentials.NewStaticCredentials(
			string(a.AWSAccessKeyID),
			string(a.AWSSecretAccessKey),
			string(a.AWSSessionToken),
		),
	}

	if a.AWSRegion != "" {
		awsConf.Region = a.AWSRegion
	}

	return session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	})
}

func (a *AWSv2Integration) STSClient() (*sts.PresignClient, error) {
	awsConf := aws.Config{
		Credentials: credentials.NewStaticCredentials(
			string(a.AWSAccessKeyID),
			string(a.AWSSecretAccessKey),
			string(a.AWSSessionToken),
		),
	}

	if a.AWSRegion != "" {
		awsConf.Region = a.AWSRegion
	}

	return sts.NewPresignClient(sts.NewFromConfig(awsConf)), nil
}

// PopulateAWSArn uses the access key/secret to get the caller identity, and
// attaches it to the AWS integration
func (a *AWSv2Integration) PopulateAWSArn() error {
	sess, err := a.GetSession()

	if err != nil {
		return err
	}

	svc := sts.New(sess)

	result, err := svc.GetCallerIdentity(&sts.GetCallerIdentityInput{})

	if err != nil {
		return err
	}

	a.AWSArn = *result.Arn

	return nil
}

// GetBearerToken retrieves a bearer token for an AWS account
func (a *AWSv2Integration) GetBearerToken(
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

	// cli, _ := a.STSClient().
	a.STSClient()

	// client := sts.NewFromConfig(x.Config)

	// presignedURLRequest, err := client.PresignGetCallerIdentity(ctx, &sts.GetCallerIdentityInput{}, func(presignOptions *sts.PresignOptions) {
	// 	presignOptions.ClientOptions = append(presignOptions.ClientOptions, g.appendPresignHeaderValuesFunc(clusterID))
	// })
	// if err != nil {
	// 	return "", fmt.Errorf("failed to presign caller identity: %w", err)
	// }

	// Set token expiration to 1 minute before the presigned URL (15 mins) expires for some cushion
	tokenExpiration := time.Now().Local().Add(14 * time.Minute)
	tokenWithPrefix := fmt.Sprintf("k8s-aws-v1.%s", base64.RawURLEncoding.EncodeToString([]byte(presignedURLRequest.URL)))

	setTokenCache(tokenWithPrefix, tokenExpiration)

	return tokenWithPrefix, nil
}
