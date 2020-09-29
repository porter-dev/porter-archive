package gorm

import (
	"database/sql"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/go-test/deep"
	"github.com/jinzhu/gorm"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
)

type Suite struct {
	suite.Suite
	db   *gorm.DB
	mock sqlmock.Sqlmock

	repo    repository.SessionRepository
	session *models.Session
}

func (s *Suite) SetupSuite() {
	var (
		db  *sql.DB
		err error
	)

	// TODO: make it work with gorm.io/gorm, currently only works with jinzhu/gorm (gorm V1)
	db, s.mock, err = sqlmock.New()
	// db, s.mock, err = sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))

	require.NoError(s.T(), err)

	s.db, err = gorm.Open("postgres", db)
	require.NoError(s.T(), err)

	s.db.LogMode(true)

	s.repo = NewSessionRepository(s.db)
}

func (s *Suite) AfterTest(_, _ string) {
	require.NoError(s.T(), s.mock.ExpectationsWereMet())
}

func TestInit(t *testing.T) {
	suite.Run(t, new(Suite))
}

func (s *Suite) TestShouldCreateNewSession() {
	var (
		key       = "onekey"
		data      = []byte("onedata")
		expiresAt = time.Now()
	)

	rows := sqlmock.NewRows([]string{"id"}).AddRow("111")

	s.mock.ExpectBegin()
	s.mock.ExpectQuery(regexp.QuoteMeta(
		`INSERT INTO "sessions" ("created_at","updated_at","deleted_at","key","data","expires_at")
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING "sessions"."id"`)).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), key, data, expiresAt).
		WillReturnRows(rows)
	s.mock.ExpectCommit()

	// test function
	_, err := s.repo.CreateSession(&models.Session{
		Key:       key,
		Data:      data,
		ExpiresAt: expiresAt,
	})

	require.NoError(s.T(), err)
}

func (s *Suite) TestShoudSelectSessionByKey() {
	var (
		key = "onekey"
	)

	rows := sqlmock.NewRows([]string{"Key"}).AddRow(key)

	s.mock.ExpectQuery(`.*`). // do proper regex labor later as meditative exercise
					WithArgs(key).
					WillReturnRows(rows)

	// test function
	res, err := s.repo.SelectSession(&models.Session{
		Key: key,
	})

	require.NoError(s.T(), err)
	require.Nil(s.T(), deep.Equal(&models.Session{Key: key}, res))
}

func (s *Suite) TestShouldUpdateSessionByKey() {
	var (
		key       = "onekey"
		data      = []byte("chobanilime")
		expiresAt = time.Now()
	)

	// rows := sqlmock.NewRows([]string{"Key"}).AddRow(key)

	s.mock.ExpectBegin()
	s.mock.ExpectExec(`.*`). // do proper regex labor later as meditative exercise
					WithArgs(data, sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), key).
					WillReturnResult(sqlmock.NewResult(1, 1))
	s.mock.ExpectCommit()

	// test function
	_, err := s.repo.UpdateSession(&models.Session{
		Key:       key,
		Data:      data,
		ExpiresAt: expiresAt,
	})

	require.NoError(s.T(), err)
	// require.Nil(s.T(), deep.Equal(&models.Session{Data: data}, res))
}

func (s *Suite) TestShouldDeleteSession() {
	var (
		key = "onekey"
	)

	// rows := sqlmock.NewRows([]string{"id"}).AddRow("111")

	s.mock.ExpectBegin()
	s.mock.ExpectExec(`.*`).
		WithArgs(sqlmock.AnyArg(), key).
		WillReturnResult(sqlmock.NewResult(1, 1))
	s.mock.ExpectCommit()

	// test function
	_, err := s.repo.DeleteSession(&models.Session{
		Key: key,
	})

	require.NoError(s.T(), err)
}
