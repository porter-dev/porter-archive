package gorm

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/porter-dev/porter/internal/telemetry"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
	"gorm.io/gorm"
)

// PorterAppEventRepository uses gorm.DB for querying the database
type PorterAppEventRepository struct {
	db *gorm.DB
}

// NewPorterAppEventRepository returns a PorterAppEventRepository which uses
// gorm.DB for querying the database
func NewPorterAppEventRepository(db *gorm.DB) repository.PorterAppEventRepository {
	return &PorterAppEventRepository{db}
}

func (repo *PorterAppEventRepository) ListEventsByPorterAppID(ctx context.Context, porterAppID uint, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error) {
	apps := []*models.PorterAppEvent{}
	paginatedResult := helpers.PaginatedResult{}

	id := strconv.Itoa(int(porterAppID))
	if id == "" {
		return nil, paginatedResult, errors.New("invalid porter app id supplied")
	}

	db := repo.db.Model(&models.PorterAppEvent{})
	resultDB := db.Where("porter_app_id = ?", id).Order("created_at DESC")
	resultDB = resultDB.Scopes(helpers.Paginate(db, &paginatedResult, opts...))

	if err := resultDB.Find(&apps).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, paginatedResult, err
		}
	}

	return apps, paginatedResult, nil
}

// ListEventsByPorterAppIDAndDeploymentTargetID returns a list of events for a given porter app id and deployment target id
func (repo *PorterAppEventRepository) ListEventsByPorterAppIDAndDeploymentTargetID(ctx context.Context, porterAppID uint, deploymentTargetID uuid.UUID, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error) {
	ctx, span := telemetry.NewSpan(ctx, "list-events-by-porter-app-id-and-deployment-target-id")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-id", Value: porterAppID},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID},
	)

	apps := []*models.PorterAppEvent{}
	paginatedResult := helpers.PaginatedResult{}

	id := strconv.Itoa(int(porterAppID))
	if id == "" {
		return nil, paginatedResult, telemetry.Error(ctx, span, nil, "invalid porter app id supplied")
	}

	db := repo.db.Model(&models.PorterAppEvent{})
	resultDB := db.Where("porter_app_id = ? AND deployment_target_id = ?", id, deploymentTargetID).Order("created_at DESC")
	resultDB = resultDB.Scopes(helpers.Paginate(db, &paginatedResult, opts...))

	if err := resultDB.Find(&apps).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, paginatedResult, telemetry.Error(ctx, span, err, "error finding events by porter app id and deployment target id")
		}
	}

	return apps, paginatedResult, nil
}

func (repo *PorterAppEventRepository) CreateEvent(ctx context.Context, appEvent *models.PorterAppEvent) error {
	if appEvent.ID == uuid.Nil {
		appEvent.ID = uuid.New()
	}
	if appEvent.CreatedAt.IsZero() {
		appEvent.CreatedAt = time.Now().UTC()
	}
	if appEvent.UpdatedAt.IsZero() {
		appEvent.UpdatedAt = time.Now().UTC()
	}
	if appEvent.PorterAppID == 0 {
		return errors.New("invalid porter app id supplied to create event")
	}

	if err := repo.db.Create(appEvent).Error; err != nil {
		return err
	}
	return nil
}

// UpdateEvent will set all values in the database to the values of the passed in appEvent
func (repo *PorterAppEventRepository) UpdateEvent(ctx context.Context, appEvent *models.PorterAppEvent) error {
	if appEvent.PorterAppID == 0 {
		return errors.New("invalid porter app id supplied to update event")
	}

	if appEvent.ID == uuid.Nil {
		return errors.New("invalid porter app event id supplied to update event")
	}

	if appEvent.UpdatedAt.IsZero() {
		appEvent.UpdatedAt = time.Now().UTC()
	}

	if err := repo.db.Model(appEvent).Updates(appEvent).Error; err != nil {
		return err
	}
	return nil
}

func (repo *PorterAppEventRepository) ReadEvent(ctx context.Context, id uuid.UUID) (models.PorterAppEvent, error) {
	appEvent := models.PorterAppEvent{}

	if id == uuid.Nil {
		return appEvent, errors.New("invalid porter app event id supplied")
	}

	strID := id.String()

	if err := repo.db.Where("id = ?", strID).First(&appEvent).Error; err != nil {
		return appEvent, err
	}

	return appEvent, nil
}

func (repo *PorterAppEventRepository) ReadNotificationsByAppRevisionID(ctx context.Context, porterAppID uint, appRevisionId string) ([]*models.PorterAppEvent, error) {
	notifications := []*models.PorterAppEvent{}

	if appRevisionId == "" {
		return notifications, errors.New("invalid app revision ID supplied")
	}

	if porterAppID == 0 {
		return notifications, errors.New("invalid porter app ID supplied")
	}

	strAppID := strconv.Itoa(int(porterAppID))

	if err := repo.db.Where("porter_app_id = ? AND type = 'NOTIFICATION' AND metadata->>'app_revision_id' = ?", strAppID, appRevisionId).Find(&notifications).Error; err != nil {
		return notifications, err
	}

	return notifications, nil
}

func (repo *PorterAppEventRepository) ReadDeployEventByRevision(ctx context.Context, porterAppID uint, revision float64) (models.PorterAppEvent, error) {
	appEvent := models.PorterAppEvent{}

	if porterAppID == 0 {
		return appEvent, errors.New("invalid porter app ID supplied")
	}

	// Convert porterAppID to string
	strAppID := strconv.Itoa(int(porterAppID))

	// Convert revision to JSON number string
	revJSON, err := json.Marshal(revision)
	if err != nil {
		return appEvent, errors.New("unable to marshal revision")
	}
	strRevision := string(revJSON)

	if err := repo.db.Where("porter_app_id = ? AND type = 'DEPLOY' AND metadata->>'revision' = ?", strAppID, strRevision).First(&appEvent).Error; err != nil {
		return appEvent, err
	}

	return appEvent, nil
}

// ReadDeployEventByAppRevisionID returns a deploy event for a given porter app id and app revision ID
func (repo *PorterAppEventRepository) ReadDeployEventByAppRevisionID(ctx context.Context, porterAppID uint, appRevisionID string) (models.PorterAppEvent, error) {
	appEvent := models.PorterAppEvent{}

	if porterAppID == 0 {
		return appEvent, errors.New("invalid porter app ID supplied")
	}

	if appRevisionID == "" {
		return appEvent, errors.New("no app revision ID supplied")
	}

	// Convert porterAppID to string
	strAppID := strconv.Itoa(int(porterAppID))

	if err := repo.db.Where("porter_app_id = ? AND type = 'DEPLOY' AND metadata->>'app_revision_id' = ?", strAppID, appRevisionID).First(&appEvent).Error; err != nil {
		return appEvent, err
	}

	return appEvent, nil
}
