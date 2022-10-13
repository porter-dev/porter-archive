package integrations

import (
	"gorm.io/gorm"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/sts"

	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/porter-dev/porter/api/types"
	"sigs.k8s.io/aws-iam-authenticator/pkg/token"
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

func (a *AWSIntegration) ToAWSIntegrationType() *types.AWSIntegration {
	return &types.AWSIntegration{
		CreatedAt: a.CreatedAt,
		ID:        a.ID,
		UserID:    a.UserID,
		ProjectID: a.ProjectID,
		AWSArn:    a.AWSArn,
	}
}

// GetSession retrieves an AWS session to use based on the access key and secret
// access key
func (a *AWSIntegration) GetSession() (*session.Session, error) {
	awsConf := &aws.Config{
		Credentials: credentials.NewStaticCredentials(
			string(a.AWSAccessKeyID),
			string(a.AWSSecretAccessKey),
			string(a.AWSSessionToken),
		),
	}

	if a.AWSRegion != "" {
		awsConf.Region = &a.AWSRegion
	}

	return session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
		Config:            *awsConf,
	})
}

// PopulateAWSArn uses the access key/secret to get the caller identity, and
// attaches it to the AWS integration
func (a *AWSIntegration) PopulateAWSArn() error {
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
func (a *AWSIntegration) GetBearerToken(
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

	generator, err := token.NewGenerator(false, false)

	if err != nil {
		return "", err
	}

	sess, err := a.GetSession()

	if err != nil {
		return "", err
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

	tok, err := generator.GetWithOptions(&token.GetTokenOptions{
		AssumeRoleARN: a.AWSAssumeRoleArn,
		Session:       sess,
		ClusterID:     validClusterId,
	})

	if err != nil {
		return "", err
	}

	setTokenCache(tok.Token, tok.Expiration)

	return tok.Token, nil
}
