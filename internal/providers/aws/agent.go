package aws

import (
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/iam"
	"github.com/porter-dev/porter/cli/cmd/utils"
	"k8s.io/client-go/kubernetes"
)

type Agent struct {
	Session    *session.Session
	IAMService *iam.IAM
	Clientset  kubernetes.Interface
}

type PorterAWSCredentials struct {
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
	AWSClusterID       string `json:"aws_cluster_id"`
}

func (a *Agent) CreateIAMKubernetesMapping(clusterIDGuess string) (*PorterAWSCredentials, error) {
	// (1) Create a new IAM user called porter-dashboard-[random_string], and attach the policy:
	//
	// arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
	name := "porter-dashboard-" + utils.StringWithCharset(6, "abcdefghijklmnopqrstuvwxyz1234567890")

	user, err := a.IAMService.CreateUser(&iam.CreateUserInput{
		UserName: &name,
	})

	if err != nil {
		return nil, err
	}

	policyArn := "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"

	_, err = a.IAMService.AttachUserPolicy(&iam.AttachUserPolicyInput{
		PolicyArn: &policyArn,
		UserName:  &name,
	})

	if err != nil {
		return nil, err
	}

	// (2) Create an access key for the porter-dashboard-[random_string] user and return the
	// access key and secret. Use the guessed cluster ID.
	resp, err := a.IAMService.CreateAccessKey(&iam.CreateAccessKeyInput{
		UserName: &name,
	})

	if err != nil {
		return nil, err
	}

	porterCreds := &PorterAWSCredentials{
		AWSAccessKeyID:     *resp.AccessKey.AccessKeyId,
		AWSSecretAccessKey: *resp.AccessKey.SecretAccessKey,
		AWSClusterID:       clusterIDGuess,
	}

	// (3) Use the eksctl authconfigmap package to map this user to a cluster identity.
	authCm, err := NewFromClientSet(a.Clientset)

	if err != nil {
		return nil, err
	}

	identity, err := NewIdentity(
		*user.User.Arn,
		"admin",
		[]string{"system:masters"},
	)

	if err != nil {
		return nil, err
	}

	err = authCm.AddIdentity(identity)

	if err != nil {
		return nil, err
	}

	err = authCm.Save()

	if err != nil {
		return nil, err
	}

	return porterCreds, nil
}
