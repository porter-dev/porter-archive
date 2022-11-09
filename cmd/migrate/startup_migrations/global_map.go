package startup_migrations

import (
	"github.com/porter-dev/porter/cmd/migrate/enable_cluster_preview_envs"
	lr "github.com/porter-dev/porter/pkg/logger"
	"gorm.io/gorm"
)

// this should be incremented with every new startup migration script
const LatestMigrationVersion uint = 1

type migrationFunc func(db *gorm.DB, logger *lr.Logger) error

var StartupMigrations = make(map[uint]migrationFunc)

func init() {
	StartupMigrations[1] = enable_cluster_preview_envs.EnableClusterPreviewEnvs
}
