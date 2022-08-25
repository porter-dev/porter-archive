package startup_migrations

import (
	"github.com/porter-dev/porter/cmd/migrate/migrate_legacy_rbac"
	lr "github.com/porter-dev/porter/pkg/logger"
	"gorm.io/gorm"
)

const LatestMigrationVersion uint = 1

type migrationFunc func(db *gorm.DB, logger *lr.Logger) error

var StartupMigrations = make(map[uint]migrationFunc)

func init() {
	StartupMigrations[1] = migrate_legacy_rbac.MigrateFromLegacyRBAC
}
