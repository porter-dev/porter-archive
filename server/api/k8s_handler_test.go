package api_test

// // ------------------------- TEST TYPES AND MAIN LOOP ------------------------- //

// type k8sTest struct {
// 	initializers []func(tester *tester)
// 	msg          string
// 	method       string
// 	endpoint     string
// 	body         string
// 	expStatus    int
// 	expBody      string
// 	useCookie    bool
// 	validators   []func(c *k8sTest, tester *tester, t *testing.T)
// }

// func testK8sRequests(t *testing.T, tests []*k8sTest, canQuery bool) {
// 	for _, c := range tests {
// 		// create a new tester
// 		tester := newTester(canQuery)

// 		// if there's an initializer, call it
// 		for _, init := range c.initializers {
// 			init(tester)
// 		}

// 		req, err := http.NewRequest(
// 			c.method,
// 			c.endpoint,
// 			strings.NewReader(c.body),
// 		)

// 		tester.req = req

// 		if c.useCookie {
// 			req.AddCookie(tester.cookie)
// 		}

// 		if err != nil {
// 			t.Fatal(err)
// 		}

// 		tester.execute()
// 		rr := tester.rr

// 		// first, check that the status matches
// 		if status := rr.Code; status != c.expStatus {
// 			t.Errorf("%s, handler returned wrong status code: got %v want %v",
// 				c.msg, status, c.expStatus)
// 		}

// 		// if there's a validator, call it
// 		for _, validate := range c.validators {
// 			validate(c, tester, t)
// 		}
// 	}
// }

// // ------------------------- TEST FIXTURES AND FUNCTIONS  ------------------------- //

// var listNamespacesTests = []*k8sTest{
// 	{
// 		initializers: []func(tester *tester){
// 			initDefaultK8s,
// 		},
// 		msg:    "List namespaces",
// 		method: "GET",
// 		endpoint: "/api/projects/1/k8s/namespaces?" + url.Values{
// 			"cluster_id": []string{"1"},
// 		}.Encode(),
// 		body:      "",
// 		expStatus: http.StatusOK,
// 		expBody:   objectsToJSON(defaultObjects),
// 		useCookie: true,
// 		validators: []func(c *k8sTest, tester *tester, t *testing.T){
// 			k8sNamespaceListValidator,
// 		},
// 	},
// }

// func TestHandleListNamespaces(t *testing.T) {
// 	testK8sRequests(t, listNamespacesTests, true)
// }

// // ------------------------- INITIALIZERS AND VALIDATORS ------------------------- //

// var defaultObjects = []runtime.Object{
// 	&v1.Namespace{
// 		ObjectMeta: metav1.ObjectMeta{
// 			Name: "test-namespace-0",
// 		},
// 	},
// 	&v1.Namespace{
// 		ObjectMeta: metav1.ObjectMeta{
// 			Name: "test-namespace-1",
// 		},
// 	},
// }

// func initDefaultK8s(tester *tester) {
// 	initUserDefault(tester)
// 	initProject(tester)
// 	initProjectClusterDefault(tester)

// 	agent := kubernetes.GetAgentTesting(defaultObjects...)

// 	// overwrite the test agent with new resources
// 	tester.app.TestAgents.K8sAgent = agent
// }

// func objectsToJSON(objs []runtime.Object) string {
// 	str, _ := json.Marshal(objs)

// 	return string(str)
// }

// func k8sNamespaceListValidator(c *k8sTest, tester *tester, t *testing.T) {
// 	gotBody := &v1.NamespaceList{}
// 	expBody := &[]v1.Namespace{}

// 	json.Unmarshal(tester.rr.Body.Bytes(), gotBody)
// 	json.Unmarshal([]byte(c.expBody), expBody)

// 	if !reflect.DeepEqual(gotBody.Items, *expBody) {
// 		t.Errorf("%s, handler returned wrong body: got %v want %v",
// 			c.msg, gotBody.Items, expBody)
// 	}
// }
