package enable_cluster_preview_envs

import (
	"testing"

	lr "github.com/porter-dev/porter/pkg/logger"
)

func TestEnableForProjectEnabled(t *testing.T) {
	logger := lr.NewConsole(true)

	tester := &tester{
		dbFileName: "./porter_cluster_preview_envs_enabled.db",
	}

	setupTestEnv(tester, t)

	defer cleanup(tester, t)

	initProjectPreviewEnabled(tester, t)
	initCluster(tester, t)

	err := EnableClusterPreviewEnvs(tester.DB, logger)

	if err != nil {
		t.Fatalf("%v\n", err)
		return
	}

	cluster, err := tester.repo.Cluster().ReadCluster(1, 1)

	if err != nil {
		t.Fatalf("%v\n", err)
		return
	}

	if !cluster.PreviewEnvsEnabled {
		t.Fatalf("expected preview envs to be enabled, got disabled")
	}
}

func TestEnableForProjectDisabled(t *testing.T) {
	logger := lr.NewConsole(true)

	tester := &tester{
		dbFileName: "./porter_cluster_preview_envs_disabled.db",
	}

	setupTestEnv(tester, t)

	defer cleanup(tester, t)

	initProjectPreviewDisabled(tester, t)
	initCluster(tester, t)

	err := EnableClusterPreviewEnvs(tester.DB, logger)

	if err != nil {
		t.Fatalf("%v\n", err)
		return
	}

	cluster, err := tester.repo.Cluster().ReadCluster(1, 1)

	if err != nil {
		t.Fatalf("%v\n", err)
		return
	}

	if cluster.PreviewEnvsEnabled {
		t.Fatalf("expected preview envs to be disabled, got enabled")
	}
}
