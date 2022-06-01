package policy_test

import (
	"testing"

	"github.com/porter-dev/porter/api/server/authz/policy"
	"github.com/porter-dev/porter/api/types"
	"github.com/stretchr/testify/assert"
)

type testHasScopeAccess struct {
	description string
	policy      []*types.PolicyDocument
	reqScopes   map[types.PermissionScope]*types.RequestAction
	expRes      bool
}

var hasScopeAccessTests = []testHasScopeAccess{
	{
		description: "admin access to project",
		policy:      types.AdminPolicy,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.ProjectScope: {
				Verb: types.APIVerbGet,
				Resource: types.NameOrUInt{
					UInt: 1,
				},
			},
		},
		expRes: true,
	},
	{
		description: "viewer access cannot perform write operation",
		policy:      types.ViewerPolicy,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.ClusterScope: {
				Verb: types.APIVerbCreate,
				Resource: types.NameOrUInt{
					UInt: 1,
				},
			},
		},
		expRes: false,
	},
	{
		description: "developer access cannot write settings",
		policy:      types.DeveloperPolicy,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.SettingsScope: {
				Verb: types.APIVerbUpdate,
				Resource: types.NameOrUInt{
					UInt: 1,
				},
			},
		},
		expRes: false,
	},
	{
		description: "custom policy for cluster 1 can write cluster 1",
		policy:      testPolicySpecificClusters,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.ClusterScope: {
				Verb: types.APIVerbUpdate,
				Resource: types.NameOrUInt{
					UInt: 1,
				},
			},
		},
		expRes: true,
	},
	{
		description: "custom policy for cluster 1 cannot write cluster 2",
		policy:      testPolicySpecificClusters,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.ClusterScope: {
				Verb: types.APIVerbUpdate,
				Resource: types.NameOrUInt{
					UInt: 2,
				},
			},
		},
		expRes: false,
	},
	{
		description: "cannot access wrong namespace + cluster combination",
		policy:      testPolicyNamespaceSpecific,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.ClusterScope: {
				Verb: types.APIVerbGet,
				Resource: types.NameOrUInt{
					UInt: 500,
				},
			},
			types.NamespaceScope: {
				Verb: types.APIVerbGet,
				Resource: types.NameOrUInt{
					Name: "default",
				},
			},
		},
		expRes: false,
	},
	{
		description: "can access set namespace + cluster combination",
		policy:      testPolicyNamespaceSpecific,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.ClusterScope: {
				Verb: types.APIVerbGet,
				Resource: types.NameOrUInt{
					UInt: 500,
				},
			},
			types.NamespaceScope: {
				Verb: types.APIVerbGet,
				Resource: types.NameOrUInt{
					Name: "abelanger",
				},
			},
		},
		expRes: true,
	},
	{
		description: "cannot write the set namespace + cluster combination",
		policy:      testPolicyNamespaceSpecific,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.ClusterScope: {
				Verb: types.APIVerbGet,
				Resource: types.NameOrUInt{
					UInt: 500,
				},
			},
			types.NamespaceScope: {
				Verb: types.APIVerbDelete,
				Resource: types.NameOrUInt{
					Name: "abelanger",
				},
			},
		},
		expRes: false,
	},
	{
		description: "test invalid policy document",
		policy:      testInvalidPolicyDocument,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.ProjectScope: {
				Verb: types.APIVerbGet,
				Resource: types.NameOrUInt{
					UInt: 1,
				},
			},
		},
		expRes: false,
	},
	{
		description: "test invalid policy document nested",
		policy:      testInvalidPolicyDocumentNested,
		reqScopes: map[types.PermissionScope]*types.RequestAction{
			types.ProjectScope: {
				Verb: types.APIVerbGet,
				Resource: types.NameOrUInt{
					UInt: 1,
				},
			},
		},
		expRes: false,
	},
}

func TestHasScopeAccess(t *testing.T) {
	assert := assert.New(t)

	for _, test := range hasScopeAccessTests {
		res := policy.HasScopeAccess(
			test.policy,
			test.reqScopes,
		)

		assert.Equal(test.expRes, res, test.description)
	}
}

func BenchmarkSimpleHasScopeAccess(b *testing.B) {
	for i := 0; i < b.N; i++ {
		res := policy.HasScopeAccess(
			testPolicySpecificClusters,
			map[types.PermissionScope]*types.RequestAction{
				types.ClusterScope: {
					Verb: types.APIVerbCreate,
					Resource: types.NameOrUInt{
						UInt: 1,
					},
				},
			},
		)

		// we expect all results to be true, so fatal if not
		if !res {
			b.Fatalf("benchmark failed correctness: expected true")
		}
	}
}

var testPolicySpecificClusters = []*types.PolicyDocument{
	{
		Scope: types.ProjectScope,
		Verbs: types.ReadWriteVerbGroup(),
		Children: map[types.PermissionScope]*types.PolicyDocument{
			types.ClusterScope: {
				Scope: types.ClusterScope,
				Verbs: types.ReadWriteVerbGroup(),
				Resources: []types.NameOrUInt{
					{
						UInt: 1,
					},
				},
			},
		},
	},
}

var testPolicyNamespaceSpecific = []*types.PolicyDocument{
	// This document allows a user to view the namespace "abelanger" in the cluster
	// with id 500.
	{
		Scope: types.ProjectScope,
		Verbs: types.ReadWriteVerbGroup(),
		Children: map[types.PermissionScope]*types.PolicyDocument{
			types.ClusterScope: {
				Scope: types.ClusterScope,
				Verbs: types.ReadVerbGroup(),
				Resources: []types.NameOrUInt{
					{
						UInt: 500,
					},
				},
				Children: map[types.PermissionScope]*types.PolicyDocument{
					types.NamespaceScope: {
						Scope: types.NamespaceScope,
						Verbs: types.ReadVerbGroup(),
						Resources: []types.NameOrUInt{
							{
								Name: "abelanger",
							},
						},
					},
				},
			},
		},
	},
	// This document allows a user to view the namespace "default" in the cluster
	// with id 501.
	{
		Scope: types.ProjectScope,
		Verbs: types.ReadWriteVerbGroup(),
		Children: map[types.PermissionScope]*types.PolicyDocument{
			types.ClusterScope: {
				Scope: types.ClusterScope,
				Verbs: types.ReadVerbGroup(),
				Resources: []types.NameOrUInt{
					{
						UInt: 501,
					},
				},
				Children: map[types.PermissionScope]*types.PolicyDocument{
					types.NamespaceScope: {
						Scope: types.NamespaceScope,
						Verbs: types.ReadVerbGroup(),
						Resources: []types.NameOrUInt{
							{
								Name: "default",
							},
						},
					},
				},
			},
		},
	},
}

// NOTE: these are invalid policy documents that don't follow the accepted heirarchy
// for scopes. Don't use this as a model for a valid doc.
var testInvalidPolicyDocument = []*types.PolicyDocument{
	{
		// invalid because cluster above project
		Scope: types.ClusterScope,
		Verbs: types.ReadWriteVerbGroup(),
		Children: map[types.PermissionScope]*types.PolicyDocument{
			types.ProjectScope: {
				Scope: types.ProjectScope,
				Verbs: types.ReadWriteVerbGroup(),
				Resources: []types.NameOrUInt{
					{
						UInt: 1,
					},
				},
			},
		},
	},
}

var testInvalidPolicyDocumentNested = []*types.PolicyDocument{
	{
		// invalid because release is a child of cluster, not namespace scope
		Scope: types.ProjectScope,
		Verbs: types.ReadWriteVerbGroup(),
		Children: map[types.PermissionScope]*types.PolicyDocument{
			types.ClusterScope: {
				Scope: types.ClusterScope,
				Verbs: types.ReadWriteVerbGroup(),
				Resources: []types.NameOrUInt{
					{
						UInt: 1,
					},
				},
				Children: map[types.PermissionScope]*types.PolicyDocument{
					types.ReleaseScope: {
						Scope: types.ReleaseScope,
						Verbs: types.ReadWriteVerbGroup(),
						Resources: []types.NameOrUInt{
							{
								UInt: 1,
							},
						},
					},
				},
			},
		},
	},
}
