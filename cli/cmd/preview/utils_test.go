package preview

import (
	"os"
	"testing"

	"github.com/matryer/is"
)

func Test_Utils(t *testing.T) {
	tests := []struct {
		name string
		run  func(*testing.T)
	}{
		{name: "get_namespace_should_return_the_environment-set_namespace", run: testUtils_getNamespace_withNamespaceEnvironmentVariable},
		{name: "getNamespace_should_return_derived_namespace_as_expected", run: testUtils_getNamespace_withoutNamespaceVariable_includesAllOtherEnvVars},
		{name: "getNamespace_should_return_default_namespace_due_to_missing_env_var", run: testUtils_getNamespace_withoutNamespaceVariable_missingOneEnvVar},
	}
	for _, tc := range tests {
		os.Clearenv()
		tc.run(t)
	}

}

func testUtils_getNamespace_withNamespaceEnvironmentVariable(t *testing.T) {
	is := is.New(t)

	expectedNamespace := "testnamespace"
	os.Setenv("PORTER_NAMESPACE", expectedNamespace)

	returnedNamespace := getNamespace()

	is.Equal(expectedNamespace, returnedNamespace) // namespace should return namespace from environment
}

func testUtils_getNamespace_withoutNamespaceVariable_includesAllOtherEnvVars(t *testing.T) {
	is := is.New(t)

	os.Setenv("PORTER_BRANCH_FROM", "testbranch")
	os.Setenv("PORTER_BRANCH_INTO", "testbranch")
	os.Setenv("PORTER_REPO_OWNER", "testowner")
	os.Setenv("PORTER_REPO_NAME", "testname")

	expectedNamespace := "previewbranch-testbranch-testowner-testname"
	returnedNamespace := getNamespace()

	is.Equal(expectedNamespace, returnedNamespace) // namespace should return generated namespace from environment variables
}

func testUtils_getNamespace_withoutNamespaceVariable_missingOneEnvVar(t *testing.T) {
	is := is.New(t)

	os.Setenv("PORTER_BRANCH_INTO", "testbranch")
	os.Setenv("PORTER_REPO_OWNER", "testowner")
	os.Setenv("PORTER_REPO_NAME", "testname")

	expectedNamespace := "default"
	returnedNamespace := getNamespace()

	is.Equal(expectedNamespace, returnedNamespace) // namespace should return default namespace
}
