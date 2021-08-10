package gorm_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

func TestCreateEvent(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_event.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	defer cleanup(tester, t)

	event := &models.Event{
		ProjectID:    tester.initProjects[0].Model.ID,
		ClusterID:    tester.initClusters[0].Model.ID,
		RefType:      "pod",
		RefName:      "pod-example-1",
		RefNamespace: "default",
		Message:      "Pod killed",
		Reason:       "OOM: memory limit exceeded",
		Data:         []byte("log from pod\nlog2 from pod"),
		Expiry:       time.Now().Add(24 * time.Hour),
	}

	copyEvent := *event

	event, err := tester.repo.Event.CreateEvent(event)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	event, err = tester.repo.Event.ReadEvent(event.Model.ID)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1 and name is "ecr"
	if event.Model.ID != 1 {
		t.Errorf("incorrect registry ID: expected %d, got %d\n", 1, event.Model.ID)
	}

	event.Model = gorm.Model{}

	if diff := deep.Equal(event, &copyEvent); diff != nil {
		t.Errorf("tokens not equal:")
		t.Error(diff)
	}
}

func TestListEventsByProjectIDWithLimit(t *testing.T) {
	suffix, _ := repository.GenerateRandomBytes(4)

	tester := &tester{
		dbFileName: fmt.Sprintf("./porter_list_events_%s.db", suffix),
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	initEvents(tester, t)
	defer cleanup(tester, t)

	testListEventsByProjectID(tester, t, &repository.ListEventOpts{
		Limit:   10,
		Type:    "node",
		Decrypt: true,
	}, tester.initEvents[50:60])
}

func TestListEventsByProjectIDWithSkip(t *testing.T) {
	suffix, _ := repository.GenerateRandomBytes(4)

	tester := &tester{
		dbFileName: fmt.Sprintf("./porter_list_events_%s.db", suffix),
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	initEvents(tester, t)
	defer cleanup(tester, t)

	testListEventsByProjectID(tester, t, &repository.ListEventOpts{
		Limit:   25,
		Skip:    10,
		Decrypt: true,
	}, tester.initEvents[10:35])
}

func TestListEventsByProjectIDWithSortBy(t *testing.T) {
	suffix, _ := repository.GenerateRandomBytes(4)

	tester := &tester{
		dbFileName: fmt.Sprintf("./porter_list_events_%s.db", suffix),
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	initEvents(tester, t)
	defer cleanup(tester, t)

	testListEventsByProjectID(tester, t, &repository.ListEventOpts{
		Limit:   1,
		Skip:    0,
		Type:    "node",
		Decrypt: true,
		SortBy:  "timestamp",
	}, tester.initEvents[99:])
}

func testListEventsByProjectID(tester *tester, t *testing.T, opts *repository.ListEventOpts, expEvents []*models.Event) {
	t.Helper()

	events, err := tester.repo.Event.ListEventsByProjectID(
		tester.initProjects[0].Model.ID,
		opts,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure data is correct
	if len(events) != len(expEvents) {
		t.Fatalf("length of events incorrect: expected %d, got %d\n", len(expEvents), len(events))
	}

	for _, expEvent := range expEvents {
		expEvent.Data = []byte("log from pod\nlog2 from pod")
	}

	if diff := deep.Equal(expEvents, events); diff != nil {
		t.Errorf("incorrect events")
		t.Error(diff)
	}
}
