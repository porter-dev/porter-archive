package session

import (
	"database/sql"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/porter-dev/porter/internal/models"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"github.com/jinzhu/gorm"
)

type Suite struct {
	suite.Suite
	DB   *gorm.DB
	mock sqlmock.Sqlmock

	repository Repository
	session    *models.Session
}

func (s *Suite) SetupSuite() {
	var (
		db  *sql.DB
		err error
	)

	db, s.mock, err = sqlmock.New()
	require.NoError(s.T(), err)

	s.DB, err = gorm.Open("postgres", db)
	require.NoError(s.T(), err)

	s.DB.LogMode(true)

	// s.repository = CreateRepository(s.DB)
}

func (s *Suite) AfterTest(_, _ string) {
	require.NoError(s.T(), s.mock.ExpectationsWereMet())
}

func TestInit(t *testing.T) {
	suite.Run(t, new(Suite))
}

func (s *Suite) TestShouldCreateNewSession(t *testing.T) {
	var (
		key       = "onekey"
		data      = []byte("onedata")
		expiresAt = time.Now()
	)

	s.mock.ExpectQuery(regexp.QuoteMeta(
		`INSERT INTO "sessions" ("key","data","expires_at") 
			VALUES ($1,$2, $3) RETURNING "key"."data"."expires_at`)).
		WithArgs(key, data, expiresAt).
		WillReturnRows(
			sqlmock.NewRows([]string{"key"}).AddRow(key))

	// db.AutoMigrate(&models.Session{})
	// defer db.Close()

	// test function
	_, err := CreateSession(s.DB, &models.Session{Key: key, Data: data, ExpiresAt: expiresAt})
	require.NoError(s.T(), err)
	// db.Migrator().DropTable(&models.Session{})
}

// func TestShouldUpdateSessionByKey(t *testing.T) {
// 	db, _ := dbConn.New()
// 	// db.AutoMigrate(&models.Session{})
// 	// defer db.Close()

// 	// test function
// 	UpdateSession(db, &models.Session{Key: "hia", Data: []byte("pls"), ExpiresAt: time.Now()})

// 	// db.Migrator().DropTable(&models.Session{})
// }

// func TestShouldDeleteSessionByKey(t *testing.T) {
// 	db, _ := dbConn.New()
// 	// db.AutoMigrate(&models.Session{})
// 	// defer db.Close()

// 	// test function
// 	DeleteSession(db, &models.Session{Key: "hia"})

// 	// db.Migrator().DropTable(&models.Session{})
// }

// func TestShoudSelectSessionByKey(t *testing.T) {
// 	db, _ := dbConn.New()
// 	// db.AutoMigrate(&models.Session{})
// 	// defer db.Close()

// 	// test function
// 	SelectSession(db, &models.Session{Key: "hi"})

// 	// db.Migrator().DropTable(&models.Session{})
// }
