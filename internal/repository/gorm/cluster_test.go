package gorm_test

import (
	"testing"
	"time"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	orm "gorm.io/gorm"
)

func TestCreateClusterCandidate(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_cc.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	cc := &models.ClusterCandidate{
		AuthMechanism:     models.AWS,
		ProjectID:         tester.initProjects[0].ID,
		CreatedClusterID:  0,
		Resolvers:         []models.ClusterResolver{},
		Name:              "cluster-test",
		Server:            "https://localhost",
		ContextName:       "context-test",
		AWSClusterIDGuess: []byte("example-cluster-0"),
		Kubeconfig:        []byte("current-context: testing\n"),
	}

	expCC := *cc

	cc, err := tester.repo.Cluster().CreateClusterCandidate(cc)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	cc, err = tester.repo.Cluster().ReadClusterCandidate(tester.initProjects[0].ID, cc.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if cc.Model.ID != 1 {
		t.Errorf("incorrect cluster candidate ID: expected %d, got %d\n", 1, cc.Model.ID)
	}

	// reset fields for deep.Equal
	cc.Model = orm.Model{}

	if diff := deep.Equal(expCC, *cc); diff != nil {
		t.Errorf("incorrect cluster candidate")
		t.Error(diff)
	}
}

func TestCreateClusterCandidateWithResolvers(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_cc.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	defer cleanup(tester, t)

	cc := &models.ClusterCandidate{
		AuthMechanism:    models.AWS,
		ProjectID:        tester.initProjects[0].ID,
		CreatedClusterID: 0,
		Resolvers: []models.ClusterResolver{
			{
				Name:     types.ClusterLocalhost,
				Resolved: false,
			},
		},
		Name:              "cluster-test",
		Server:            "https://localhost",
		ContextName:       "context-test",
		AWSClusterIDGuess: []byte("example-cluster-0"),
		Kubeconfig:        []byte("current-context: testing\n"),
	}

	expCC := *cc

	cc, err := tester.repo.Cluster().CreateClusterCandidate(cc)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	cc, err = tester.repo.Cluster().ReadClusterCandidate(tester.initProjects[0].ID, cc.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if cc.Model.ID != 1 {
		t.Errorf("incorrect cluster candidate ID: expected %d, got %d\n", 1, cc.Model.ID)
	}

	// make sure length of resolvers is 1
	if len(cc.Resolvers) != 1 {
		t.Fatalf("incorrect cluster candidate resolvers length: expected %d, got %d\n", 1, len(cc.Resolvers))
	}

	// make sure resolver cluster candidate id is 1
	if cc.Resolvers[0].ClusterCandidateID != 1 {
		t.Errorf("incorrect resolver ClusterCandidateID: expected %d, got %d\n", 1, cc.Resolvers[0].ClusterCandidateID)
	}

	// reset fields for deep.Equal
	cc.Model = orm.Model{}
	cc.Resolvers[0].Model = orm.Model{}
	expCC.Resolvers[0].Model = orm.Model{}
	expCC.Resolvers[0].ClusterCandidateID = 1

	if diff := deep.Equal(expCC, *cc); diff != nil {
		t.Errorf("incorrect cluster candidate")
		t.Error(diff)
	}
}

func TestListClusterCandidatesByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_ccs.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initClusterCandidate(tester, t)
	defer cleanup(tester, t)

	ccs, err := tester.repo.Cluster().ListClusterCandidatesByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(ccs) != 1 {
		t.Fatalf("length of cluster candidates incorrect: expected %d, got %d\n", 1, len(ccs))
	}

	// make sure data is correct
	expCC := models.ClusterCandidate{
		AuthMechanism:     models.AWS,
		ProjectID:         tester.initProjects[0].ID,
		CreatedClusterID:  0,
		Resolvers:         []models.ClusterResolver{},
		Name:              "cluster-test",
		Server:            "https://localhost",
		ContextName:       "context-test",
		AWSClusterIDGuess: []byte("example-cluster-0"),
		Kubeconfig:        []byte("current-context: testing\n"),
	}

	cc := ccs[0]

	// reset fields for reflect.DeepEqual
	cc.Model = orm.Model{}

	if diff := deep.Equal(expCC, *cc); diff != nil {
		t.Errorf("incorrect cluster candidate")
		t.Error(diff)
	}
}

func TestUpdateClusterCandidateCreatedClusterID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_update_cc_cluster_id.db",
	}

	setupTestEnv(tester, t)
	initClusterCandidate(tester, t)
	initCluster(tester, t)
	defer cleanup(tester, t)

	cc, err := tester.repo.Cluster().UpdateClusterCandidateCreatedClusterID(
		tester.initCCs[0].ID,
		tester.initClusters[0].ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	expCC := models.ClusterCandidate{
		AuthMechanism:     models.AWS,
		ProjectID:         tester.initProjects[0].ID,
		CreatedClusterID:  tester.initClusters[0].ID,
		Name:              "cluster-test",
		Server:            "https://localhost",
		ContextName:       "context-test",
		AWSClusterIDGuess: []byte("example-cluster-0"),
		Kubeconfig:        []byte("current-context: testing\n"),
	}

	// reset fields for reflect.DeepEqual
	cc.Model = orm.Model{}

	if diff := deep.Equal(expCC, *cc); diff != nil {
		t.Errorf("incorrect cluster candidate")
		t.Error(diff)
	}
}

func TestCreateCluster(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_cluster.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initKubeIntegration(tester, t)
	defer cleanup(tester, t)

	cluster := &models.Cluster{
		ProjectID:                tester.initProjects[0].ID,
		Name:                     "cluster-test",
		Server:                   "https://localhost",
		KubeIntegrationID:        tester.initKIs[0].ID,
		CertificateAuthorityData: []byte("-----BEGIN"),
	}

	expCluster := *cluster

	cluster, err := tester.repo.Cluster().CreateCluster(cluster)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	cluster, err = tester.repo.Cluster().ReadCluster(tester.initProjects[0].ID, cluster.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if cluster.Model.ID != 1 {
		t.Errorf("incorrect cluster ID: expected %d, got %d\n", 1, cluster.Model.ID)
	}

	// reset fields for deep.Equal
	cluster.Model = orm.Model{}

	if diff := deep.Equal(expCluster, *cluster); diff != nil {
		t.Errorf("incorrect cluster")
		t.Error(diff)
	}
}

func TestListClustersByProjectID(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_list_clusters.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	defer cleanup(tester, t)

	clusters, err := tester.repo.Cluster().ListClustersByProjectID(
		tester.initProjects[0].Model.ID,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(clusters) != 1 {
		t.Fatalf("length of clusters incorrect: expected %d, got %d\n", 1, len(clusters))
	}

	// make sure data is correct
	expCluster := models.Cluster{
		ProjectID:                tester.initProjects[0].ID,
		Name:                     "cluster-test",
		Server:                   "https://localhost",
		KubeIntegrationID:        tester.initKIs[0].ID,
		CertificateAuthorityData: []byte("-----BEGIN"),
	}

	cluster := clusters[0]

	// reset fields for reflect.DeepEqual
	cluster.Model = orm.Model{}

	if diff := deep.Equal(expCluster, *cluster); diff != nil {
		t.Errorf("incorrect cluster")
		t.Error(diff)
	}
}

func TestUpdateCluster(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_update_cluster.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	defer cleanup(tester, t)

	cluster := tester.initClusters[0]

	cluster.Name = "cluster-new-name"

	cluster, err := tester.repo.Cluster().UpdateCluster(
		cluster,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	cluster, err = tester.repo.Cluster().ReadCluster(tester.initProjects[0].ID, tester.initClusters[0].ID)

	// make sure data is correct
	expCluster := models.Cluster{
		ProjectID:                tester.initProjects[0].ID,
		Name:                     "cluster-new-name",
		Server:                   "https://localhost",
		KubeIntegrationID:        tester.initKIs[0].ID,
		CertificateAuthorityData: []byte("-----BEGIN"),
	}

	// reset fields for reflect.DeepEqual
	cluster.Model = orm.Model{}

	if diff := deep.Equal(expCluster, *cluster); diff != nil {
		t.Errorf("incorrect cluster")
		t.Error(diff)
	}
}

func TestUpdateClusterToken(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_test_update_cluster_token.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initKubeIntegration(tester, t)
	defer cleanup(tester, t)

	cluster := &models.Cluster{
		ProjectID:                tester.initProjects[0].ID,
		Name:                     "cluster-test",
		Server:                   "https://localhost",
		KubeIntegrationID:        tester.initKIs[0].ID,
		CertificateAuthorityData: []byte("-----BEGIN"),
		TokenCache: ints.ClusterTokenCache{
			TokenCache: ints.TokenCache{
				Token:  []byte("token-1"),
				Expiry: time.Now().Add(-1 * time.Hour),
			},
		},
	}

	cluster, err := tester.repo.Cluster().CreateCluster(cluster)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	cluster, err = tester.repo.Cluster().ReadCluster(tester.initProjects[0].ID, cluster.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure cluster id of token is 1
	if cluster.TokenCache.ClusterID != 1 {
		t.Fatalf("incorrect cluster id in token cache: expected %d, got %d\n", 1, cluster.TokenCache.ClusterID)
	}

	// make sure old token is token-1
	if string(cluster.TokenCache.Token) != "token-1" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "token-1", cluster.TokenCache.Token)
	}

	// make sure old token is expired
	if isExpired := cluster.TokenCache.IsExpired(); !isExpired {
		t.Fatalf("token was not expired\n")
	}

	cluster.TokenCache.Token = []byte("token-2")
	cluster.TokenCache.Expiry = time.Now().Add(24 * time.Hour)

	cluster, err = tester.repo.Cluster().UpdateClusterTokenCache(&cluster.TokenCache)
	if err != nil {
		t.Fatalf("%v\n", err)
	}
	cluster, err = tester.repo.Cluster().ReadCluster(tester.initProjects[0].ID, cluster.Model.ID)
	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1
	if cluster.Model.ID != 1 {
		t.Errorf("incorrect service account ID: expected %d, got %d\n", 1, cluster.Model.ID)
	}

	// make sure new token is correct and not expired
	if cluster.TokenCache.ClusterID != 1 {
		t.Fatalf("incorrect service account ID in token cache: expected %d, got %d\n", 1, cluster.TokenCache.ClusterID)
	}

	if isExpired := cluster.TokenCache.IsExpired(); isExpired {
		t.Fatalf("token was expired\n")
	}

	if string(cluster.TokenCache.Token) != "token-2" {
		t.Errorf("incorrect token in cache: expected %s, got %s\n", "token-2", cluster.TokenCache.Token)
	}
}

func TestDeleteCluster(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_delete_cluster.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	defer cleanup(tester, t)

	cluster, err := tester.repo.Cluster().ReadCluster(tester.initProjects[0].ID, tester.initClusters[0].Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	err = tester.repo.Cluster().DeleteCluster(cluster)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	_, err = tester.repo.Cluster().ReadCluster(tester.initProjects[0].ID, tester.initClusters[0].Model.ID)

	if err != orm.ErrRecordNotFound {
		t.Fatalf("incorrect error: expected %v, got %v\n", orm.ErrRecordNotFound, err)
	}

	clusters, err := tester.repo.Cluster().ListClustersByProjectID(tester.initProjects[0].Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	if len(clusters) != 0 {
		t.Fatalf("length of clusters was not 0")
	}
}
