package cmd

import (
	"net/http"
	"os"
	"testing"

	"github.com/matryer/is"
	"github.com/porter-dev/porter/api/client"
	switchboardTypes "github.com/porter-dev/switchboard/pkg/types"
)

func Test_Apply(t *testing.T) {
	tests := []struct {
		name string
		run  func(*testing.T, DeploymentHookConfig)
	}{
		{name: "preapply namespace defaults due to missing namespace env var", run: testPreApply_DeploymentHook_NamespaceDefaultWithEnvVar},
		{name: "preapply namespace overrides to provided namespace from env var", run: testPreApply_DeploymentHook_NamespaceOverrideWithEnvVar},
	}
	for _, tc := range tests {
		cli := client.Client{
			BaseURL:    "localhost",
			HTTPClient: http.DefaultClient,
		}
		conf := DeploymentHookConfig{
			PorterAPIClient: &cli,
			ResourceGroup:   &switchboardTypes.ResourceGroup{},
			GithubAppID:     -1,
			PullRequestID:   -1,
			GithubActionID:  -1,
		}
		tc.run(t, conf)
	}

}

func testPreApply_DeploymentHook_NamespaceDefaultWithEnvVar(t *testing.T, conf DeploymentHookConfig) {
	is := is.New(t)

	os.Setenv("PORTER_BRANCH_FROM", "testbranch")
	os.Setenv("PORTER_BRANCH_INTO", "testbranch")
	os.Setenv("PORTER_REPO_OWNER", "testowner")
	os.Setenv("PORTER_REPO_NAME", "testname")

	dh, err := NewDeploymentHook(conf)
	is.NoErr(err) // no intended errors for setting up deployment hook

	expectedNamespace := "previewbranch-testbranch-testowner-testname"
	is.Equal(expectedNamespace, dh.namespace) // namespace should be generated based on provided env vars
}

func testPreApply_DeploymentHook_NamespaceOverrideWithEnvVar(t *testing.T, conf DeploymentHookConfig) {
	is := is.New(t)

	conf.BranchFrom = "anything"
	conf.RepoName = "anything"
	conf.RepoOwner = "anything"

	customNamespace := "custom-namespace"
	os.Setenv("PORTER_NAMESPACE", customNamespace)

	dh, err := NewDeploymentHook(conf)
	is.NoErr(err) // no intended errors for setting up deployment hook

	is.Equal(customNamespace, dh.namespace) // namespace should be overridden entirely
}
