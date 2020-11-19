package gorm_test

// func TestCreateGitRepo(t *testing.T) {
// 	tester := &tester{
// 		dbFileName: "./porter_create_gr.db",
// 	}

// 	setupTestEnv(tester, t)
// 	initUser(tester, t)
// 	initProject(tester, t)
// 	defer cleanup(tester, t)

// 	repoClient := &models.GitRepo{
// 		ProjectID:    tester.initProjects[0].ID,
// 		UserID:       tester.initUsers[0].ID,
// 		RepoUserID:   1,
// 		Kind:         models.GitRepoGithub,
// 		AccessToken:  []byte("accesstoken1234"),
// 		RefreshToken: []byte("refreshtoken1234"),
// 	}

// 	repoClient, err := tester.repo.GitRepo.CreateGitRepo(repoClient)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	repoClient, err = tester.repo.GitRepo.ReadGitRepo(repoClient.Model.ID)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	// make sure id is 1
// 	if repoClient.Model.ID != 1 {
// 		t.Errorf("incorrect repo client ID: expected %d, got %d\n", 1, repoClient.Model.ID)
// 	}

// 	// make sure data is correct
// 	expGitRepo := &models.GitRepo{
// 		ProjectID:    tester.initProjects[0].ID,
// 		UserID:       tester.initUsers[0].ID,
// 		RepoUserID:   1,
// 		Kind:         models.GitRepoGithub,
// 		AccessToken:  []byte("accesstoken1234"),
// 		RefreshToken: []byte("refreshtoken1234"),
// 	}

// 	copyGitRepo := repoClient

// 	// reset fields for reflect.DeepEqual
// 	copyGitRepo.Model = orm.Model{}

// 	if diff := deep.Equal(copyGitRepo, expGitRepo); diff != nil {
// 		t.Errorf("incorrect repo client")
// 		t.Error(diff)
// 	}
// }

// func TestListGitReposByProjectID(t *testing.T) {
// 	tester := &tester{
// 		dbFileName: "./porter_list_grs.db",
// 	}

// 	setupTestEnv(tester, t)
// 	initUser(tester, t)
// 	initProject(tester, t)
// 	initServiceAccount(tester, t)
// 	initGitRepo(tester, t)
// 	defer cleanup(tester, t)

// 	grs, err := tester.repo.GitRepo.ListGitReposByProjectID(
// 		tester.initProjects[0].Model.ID,
// 	)

// 	if err != nil {
// 		t.Fatalf("%v\n", err)
// 	}

// 	if len(grs) != 1 {
// 		t.Fatalf("length of grs incorrect: expected %d, got %d\n", 1, len(grs))
// 	}

// 	// make sure data is correct
// 	// make sure data is correct
// 	expGitRepo := &models.GitRepo{
// 		ProjectID:    tester.initProjects[0].ID,
// 		UserID:       tester.initUsers[0].ID,
// 		RepoUserID:   1,
// 		Kind:         models.GitRepoGithub,
// 		AccessToken:  []byte("accesstoken1234"),
// 		RefreshToken: []byte("refreshtoken1234"),
// 	}

// 	copyGitRepo := grs[0]

// 	// reset fields for reflect.DeepEqual
// 	copyGitRepo.Model = orm.Model{}

// 	if diff := deep.Equal(copyGitRepo, expGitRepo); diff != nil {
// 		t.Errorf("incorrect repo client")
// 		t.Error(diff)
// 	}
// }
