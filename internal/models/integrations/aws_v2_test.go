package integrations

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	"github.com/matryer/is"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

func TestAWS(t *testing.T) {

	tt := []struct {
		name string
		run  func(t *testing.T)
	}{
		{
			name: "create sts client and get token for eks api",
			run:  testAWS_sts_getBearerToken,
		},
		{
			name: "create sts client, get token for eks api and query pods",
			run:  testAWS_sts_getBearerToken_and_use,
		},
	}

	for _, tc := range tt {
		tc.run(t)
	}
}

func setupCredentials() AWSIntegration {
	return AWSIntegration{
		AWSAccessKeyID:     []byte("AKIA6GBDZ5AFIXXBCM44"),
		AWSSecretAccessKey: []byte("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"),
		AWSRegion:          "us-east-2",
	}
}

func testAWS_sts_getBearerToken(t *testing.T) {
	is := is.New(t)
	ctx := context.Background()

	creds := setupCredentials()

	getTokenFunc := func() (tok *TokenCache, err error) { return nil, nil }
	setTokenFunc := func(token string, expiry time.Time) error { return nil }

	tok, err := creds.GetBearerToken(ctx, getTokenFunc, setTokenFunc, "stefan-test-delete-after-2022-12-13", false)
	is.NoErr(err)
	is.True(tok != "")                            // bearer token should be returned
	is.True(strings.Contains(tok, "k8s-aws-v1.")) // bearer token should have prefix of 'k8s-aws-v1.'
}

func testAWS_sts_getBearerToken_and_use(t *testing.T) {
	is := is.New(t)
	ctx := context.Background()

	creds := setupCredentials()

	getTokenFunc := func() (tok *TokenCache, err error) { return nil, nil }
	setTokenFunc := func(token string, expiry time.Time) error { return nil }

	tok, err := creds.GetBearerToken(ctx, getTokenFunc, setTokenFunc, "staging", false)
	is.NoErr(err)
	is.True(tok != "")                            // bearer token should be returned
	is.True(strings.Contains(tok, "k8s-aws-v1.")) // bearer token should have prefix of 'k8s-aws-v1.'

	clientset, err := kubernetes.NewForConfig(
		&rest.Config{
			Host:            "https://94F11C029AC50CF7DC10C80861305430.gr7.us-east-2.eks.amazonaws.com",
			BearerToken:     tok,
			TLSClientConfig: rest.TLSClientConfig{Insecure: true},
		},
	)
	if err != nil {
		panic(err.Error())
	}

	// Use the clientset to make API calls
	pods, err := clientset.CoreV1().Pods("").List(ctx, v1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}

	fmt.Println(pods)

	svc := eks.NewFromConfig(creds.Config())
	clusters, err := svc.DescribeCluster(ctx, &eks.DescribeClusterInput{
		Name: aws.String("dev"),
	})
	is.NoErr(err)
	fmt.Printf("%#v", clusters.Cluster)
}
