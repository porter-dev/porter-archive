package local

import (
	"github.com/aws/aws-sdk-go/service/iam"
	"github.com/porter-dev/porter/cli/cmd/providers/aws"
	"github.com/porter-dev/porter/internal/kubernetes/local"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/aws/aws-sdk-go/aws/session"
)

// NewDefaultAgent returns an AWS agent without a k8s clientset
func NewDefaultAgent() *aws.Agent {
	sess := session.Must(session.NewSession())

	iamSvc := iam.New(sess)

	// Return a new agent with AWS session and iam service
	return &aws.Agent{
		Session:    sess,
		IAMService: iamSvc,
		Clientset:  nil,
	}
}

// NewDefaultKubernetesAgent returns an AWS agent using local credentials.
func NewDefaultKubernetesAgent(kubeconfigPath string, contextName string) (*aws.Agent, error) {
	// (1) Construct a local clientset from the AWS context, and use the eksctl authconfigmap package
	// to read the current identities of the config map, to make sure user has access. Save the created
	// clientset.
	rawBytes, err := local.GetKubeconfigFromHost(kubeconfigPath, []string{contextName})
	if err != nil {
		return nil, err
	}

	conf, err := clientcmd.NewClientConfigFromBytes(rawBytes)

	rawConf, err := conf.RawConfig()

	conf = clientcmd.NewDefaultClientConfig(rawConf, &clientcmd.ConfigOverrides{
		CurrentContext: contextName,
	})

	restConf, err := conf.ClientConfig()
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(restConf)
	if err != nil {
		return nil, err
	}

	sess := session.Must(session.NewSession())

	iamSvc := iam.New(sess)

	// Return a new agent with AWS session and clientset
	return &aws.Agent{
		Session:    sess,
		IAMService: iamSvc,
		Clientset:  clientset,
	}, nil
}
