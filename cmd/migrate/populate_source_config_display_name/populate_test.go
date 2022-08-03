package populate_source_config_display_name_test

import (
	"testing"

	"github.com/porter-dev/porter/cmd/migrate/populate_source_config_display_name"

	"github.com/porter-dev/porter/internal/models"
	lr "github.com/porter-dev/porter/pkg/logger"
)

func TestAllSourceConfigsArePopulated(t *testing.T) {
	logger := lr.NewConsole(true)

	tester := &tester{
		dbFileName: "./porter_stable_source_config_id_population.db",
	}

	setupTestEnv(tester, t)

	defer cleanup(tester, t)

	stackName := "first-stack"

	initStack(tester, t, stackName)

	createNewStackRevision(tester, t, stackName)

	createNewStackRevision(tester, t, stackName)

	createNewStackRevision(tester, t, stackName)

	err := populate_source_config_display_name.PopulateSourceConfigDisplayName(tester.DB, logger)

	if err != nil {
		t.Fatalf("%\n", err)
		return
	}

	sourceConfigs := []*models.StackSourceConfig{}

	if err := tester.DB.Find(&sourceConfigs).Error; err != nil {
		t.Fatalf("failed to find source configs: %s", err)
	}

	if len(sourceConfigs) != 4 {
		t.Fatalf("expected 4 source configs, got %d", len(sourceConfigs))
	}

	for _, sc := range sourceConfigs {
		if sc.DisplayName == "" {
			t.Fatalf("expected display name to be populated, got empty string")
		}
	}
}

func TestPopulateOnEmptyStack(t *testing.T) {
	logger := lr.NewConsole(true)

	tester := &tester{
		dbFileName: "./porter_stable_source_config_id_population.db",
	}

	setupTestEnv(tester, t)

	initEmptyStack(tester, t, "empty-stack")

	defer cleanup(tester, t)

	err := populate_source_config_display_name.PopulateSourceConfigDisplayName(tester.DB, logger)

	if err != nil {
		t.Fatalf("expected no error, got %s", err)
		return
	}
}
