package gorm_test

import (
	"fmt"
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

func TestCreateKubeEvent(t *testing.T) {
	tester := &tester{
		dbFileName: "./porter_create_event.db",
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	defer cleanup(tester, t)

	event := &models.KubeEvent{
		ProjectID: tester.initProjects[0].Model.ID,
		ClusterID: tester.initClusters[0].Model.ID,
		EventType: "pod",
		Name:      "pod-example-1",
		Namespace: "default",
		Message:   "Pod killed",
		Reason:    "OOM: memory limit exceeded",
		Data:      []byte("log from pod\nlog2 from pod"),
	}

	copyKubeEvent := *event

	event, err := tester.repo.KubeEvent().CreateEvent(event)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	event, err = tester.repo.KubeEvent().ReadEvent(event.Model.ID, 1, 1)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure id is 1 and name is "ecr"
	if event.Model.ID != 1 {
		t.Errorf("incorrect registry ID: expected %d, got %d\n", 1, event.Model.ID)
	}

	event.Model = gorm.Model{}

	if diff := deep.Equal(event, &copyKubeEvent); diff != nil {
		t.Errorf("tokens not equal:")
		t.Error(diff)
	}
}

func TestListKubeEventsByProjectIDWithLimit(t *testing.T) {
	suffix, _ := repository.GenerateRandomBytes(4)

	tester := &tester{
		dbFileName: fmt.Sprintf("./porter_list_events_%s.db", suffix),
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	initKubeEvents(tester, t)
	defer cleanup(tester, t)

	testListKubeEventsByProjectID(tester, t, 1, true, &types.ListKubeEventRequest{
		Limit: 10,
		Type:  "node",
	}, tester.initKubeEvents[50:60])
}

func TestListKubeEventsByProjectIDWithSkip(t *testing.T) {
	suffix, _ := repository.GenerateRandomBytes(4)

	tester := &tester{
		dbFileName: fmt.Sprintf("./porter_list_events_%s.db", suffix),
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	initKubeEvents(tester, t)
	defer cleanup(tester, t)

	testListKubeEventsByProjectID(tester, t, 1, true, &types.ListKubeEventRequest{
		Limit: 25,
		Skip:  10,
	}, tester.initKubeEvents[10:35])
}

func TestListKubeEventsByProjectIDWithSortBy(t *testing.T) {
	suffix, _ := repository.GenerateRandomBytes(4)

	tester := &tester{
		dbFileName: fmt.Sprintf("./porter_list_events_%s.db", suffix),
	}

	setupTestEnv(tester, t)
	initProject(tester, t)
	initCluster(tester, t)
	initKubeEvents(tester, t)
	defer cleanup(tester, t)

	testListKubeEventsByProjectID(tester, t, 1, true, &types.ListKubeEventRequest{
		Limit:  1,
		Skip:   0,
		Type:   "node",
		SortBy: "timestamp",
	}, tester.initKubeEvents[99:])
}

func testListKubeEventsByProjectID(tester *tester, t *testing.T, clusterID uint, decrypt bool, opts *types.ListKubeEventRequest, expKubeEvents []*models.KubeEvent) {
	t.Helper()

	events, err := tester.repo.KubeEvent().ListEventsByProjectID(
		tester.initProjects[0].Model.ID,
		clusterID,
		opts,
		decrypt,
	)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	// make sure data is correct
	if len(events) != len(expKubeEvents) {
		t.Fatalf("length of events incorrect: expected %d, got %d\n", len(expKubeEvents), len(events))
	}

	for _, expKubeEvent := range expKubeEvents {
		expKubeEvent.Data = []byte("log from pod\nlog2 from pod")
	}

	if diff := deep.Equal(expKubeEvents, events); diff != nil {
		t.Errorf("incorrect events")
		t.Error(diff)
	}
}
