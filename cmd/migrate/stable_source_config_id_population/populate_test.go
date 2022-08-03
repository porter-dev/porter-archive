package stable_source_config_id_population_test

import (
	"testing"

	"github.com/porter-dev/porter/cmd/migrate/stable_source_config_id_population"
	"github.com/porter-dev/porter/internal/encryption"
	"github.com/porter-dev/porter/internal/models"
	lr "github.com/porter-dev/porter/pkg/logger"
)

func TestAllSourceConfigHaveSameStableSourceConfigID(t *testing.T) {
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

	stable_source_config_id_population.PopulateStableSourceConfigId(tester.DB, logger)

	sourceConfigs := []*models.StackSourceConfig{}

	if err := tester.DB.Find(&sourceConfigs).Error; err != nil {
		t.Fatalf("failed to find source configs: %s", err)
	}

	if len(sourceConfigs) != 4 {
		t.Fatalf("expected 4 source configs, got %d", len(sourceConfigs))
	}

	for _, sc := range sourceConfigs {
		if sc.StableSourceConfigID == "" {
			t.Fatalf("expected stable source config id to be populated, got empty string")
		}
	}

	// check if all StableSourceConfigID are equal
	for _, sc := range sourceConfigs {
		if sc.StableSourceConfigID != sourceConfigs[0].StableSourceConfigID {
			t.Fatalf("expected all StableSourceConfigID to be equal, got %s", sc.StableSourceConfigID)
		}
	}

}

func TestSourceConfigWithDifferentNamesShouldHaveDifferentStableSourceConfigID(t *testing.T) {
	logger := lr.NewConsole(true)
	tester := &tester{
		dbFileName: "./porter_stable_source_config_id_population.db",
	}

	setupTestEnv(tester, t)

	initStack(tester, t, "first-stack")

	defer cleanup(tester, t)

	createNewStackRevision(tester, t, "first-stack")

	uid, _ := encryption.GenerateRandomBytes(16)

	newSourceConfig := &models.StackSourceConfig{
		Name:         "second-source-config",
		ImageRepoURI: "docker.io/porter-dev/porter-test-image",
		ImageTag:     "latest",
		UID:          uid,
	}

	appendNewSourceConfig(t, tester, tester.initStacks[0], *newSourceConfig)

	stable_source_config_id_population.PopulateStableSourceConfigId(tester.DB, logger)

	sourceConfigs := []*models.StackSourceConfig{}

	if err := tester.DB.Find(&sourceConfigs).Error; err != nil {
		t.Fatalf("failed to find source configs: %s", err)
	}

	if len(sourceConfigs) != 3 {
		t.Fatalf("expected 3 source configs, got %d", len(sourceConfigs))
	}

	for _, sc := range sourceConfigs {
		if sc.StableSourceConfigID == "" {
			t.Fatalf("expected stable source config id to be populated, got empty string on source config %s", sc.Name)
		}
	}

	// map source configs into a map of StableSourceConfigID to SourceConfig
	sourceConfigMap := make(map[string][]*models.StackSourceConfig)

	for _, sc := range sourceConfigs {
		sourceConfigMap[sc.Name] = append(sourceConfigMap[sc.Name], sc)
	}

	// check if all source configs that share name have the same StableSourceConfigID
	for sourceConfigName := range sourceConfigMap {
		for _, sc := range sourceConfigMap[sourceConfigName] {
			if sc.StableSourceConfigID != sourceConfigMap[sourceConfigName][0].StableSourceConfigID {
				t.Fatalf("expected all StableSourceConfigID to be equal, got %s", sc.StableSourceConfigID)
			}
		}
	}
}

func TestSourceConfigsFromDifferentStacksShouldHaveDifferentStableSourceConfigId(t *testing.T) {
	logger := lr.NewConsole(true)
	tester := &tester{
		dbFileName: "./porter_stable_source_config_id_population.db",
	}

	setupTestEnv(tester, t)

	initStack(tester, t, "first-stack")
	initStack(tester, t, "second-stack")

	defer cleanup(tester, t)

	createNewStackRevision(tester, t, "first-stack")
	createNewStackRevision(tester, t, "second-stack")
	createNewStackRevision(tester, t, "first-stack")
	createNewStackRevision(tester, t, "second-stack")

	stable_source_config_id_population.PopulateStableSourceConfigId(tester.DB, logger)

	sourceConfigs := []*models.StackSourceConfig{}

	if err := tester.DB.Find(&sourceConfigs).Error; err != nil {
		t.Fatalf("failed to find source configs: %s", err)
	}

	if len(sourceConfigs) != 6 {
		t.Fatalf("expected 6 source configs, got %d", len(sourceConfigs))
	}

	for _, sc := range sourceConfigs {
		if sc.StableSourceConfigID == "" {
			t.Fatalf("expected stable source config id to be populated, got empty string on source config %s", sc.Name)
		}
	}

	var firstStack *models.Stack
	var secondStack *models.Stack

	stacks := []*models.Stack{}

	if err := tester.DB.Model(&models.Stack{}).Preload("Revisions").Preload("Revisions.SourceConfigs").Find(&stacks).Error; err != nil {
		t.Fatalf("failed to find stacks: %s", err)
	}

	for _, stack := range stacks {
		if stack.Name == "first-stack" {
			firstStack = stack
		} else if stack.Name == "second-stack" {
			secondStack = stack
		}
	}

	firstStackSourceConfigs := []models.StackSourceConfig{}
	// Get source configs from revisions on firstStack
	for _, revision := range firstStack.Revisions {
		for _, sourceConfig := range revision.SourceConfigs {
			firstStackSourceConfigs = append(firstStackSourceConfigs, sourceConfig)
		}
	}

	secondStackSourceConfigs := []models.StackSourceConfig{}
	// Get source configs from revisions on secondStack
	for _, revision := range secondStack.Revisions {
		for _, sourceConfig := range revision.SourceConfigs {
			secondStackSourceConfigs = append(secondStackSourceConfigs, sourceConfig)
		}
	}

	// Check that all the source configs from the stacks have the same StableSourceConfigID
	for _, sc := range firstStackSourceConfigs {
		if sc.StableSourceConfigID != firstStackSourceConfigs[0].StableSourceConfigID {
			t.Fatalf("expected all StableSourceConfigID to be equal, got %s", sc.StableSourceConfigID)
		}
	}

	for _, sc := range secondStackSourceConfigs {
		if sc.StableSourceConfigID != secondStackSourceConfigs[0].StableSourceConfigID {
			t.Fatalf("expected all StableSourceConfigID to be equal, got %s", sc.StableSourceConfigID)
		}
	}

	// check that all source configs from first stack have different StableSourceConfigID than source configs from second stack
	for _, sc := range firstStackSourceConfigs {
		for _, sc2 := range secondStackSourceConfigs {
			if sc.StableSourceConfigID == sc2.StableSourceConfigID {
				t.Fatalf("expected all StableSourceConfigID to be different, got %s", sc.StableSourceConfigID)
			}
		}
	}

}
