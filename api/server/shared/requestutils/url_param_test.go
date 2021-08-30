package requestutils_test

import (
	"context"
	"fmt"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/apitest"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/stretchr/testify/assert"
)

type getURLParamTest struct {
	description string
	route       string
	routeParams map[string]string
	paramReq    string
}

type getURLParamErrTest struct {
	getURLParamTest
	expErrStr string
}

const urlParamNotFoundFmt = "could not find url param %s"
const urlParamErrUintConvFmt = "could not convert url parameter %s to uint, got %s"

var getURLUintParamErrTests = []getURLParamErrTest{
	{
		getURLParamTest: getURLParamTest{
			description: "should fail when not found",
			route:       "/api",
			routeParams: map[string]string{},
			paramReq:    "project_id",
		},
		expErrStr: fmt.Sprintf(urlParamNotFoundFmt, "project_id"),
	},
	{
		getURLParamTest: getURLParamTest{
			description: "should fail when not uint",
			route:       "/api/notuint",
			routeParams: map[string]string{
				"project_id": "notuint",
			},
			paramReq: "project_id",
		},
		expErrStr: fmt.Sprintf(urlParamErrUintConvFmt, "project_id", "notuint"),
	},
}

func TestGetURLUintParamsErrors(t *testing.T) {
	for _, test := range getURLUintParamErrTests {
		r := httptest.NewRequest("POST", test.route, nil)

		// set the context for testing
		r = apitest.WithURLParams(t, r, test.routeParams)

		_, err := requestutils.GetURLParamUint(r, types.URLParam(test.paramReq))

		if err == nil {
			t.Fatalf("[ %s ] did not return an error when error was expected", test.description)
		}

		assert.EqualError(t, err, test.expErrStr)

		var expErrTarget apierrors.RequestError
		assert.ErrorAs(t, err, &expErrTarget)
	}
}

type getURLParamStringTest struct {
	getURLParamTest
	expStr string
}

func TestGetURLParamString(t *testing.T) {
	r := httptest.NewRequest("POST", "/api/test", nil)

	// set the context for testing
	rctx := chi.NewRouteContext()
	routeParams := &chi.RouteParams{}

	routeParams.Add("name", "test")

	rctx.URLParams = *routeParams

	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	res, err := requestutils.GetURLParamString(r, "name")

	if err != nil {
		t.Fatalf("[ GetURLParamString ] returneed an error when no error was expected, %v", err.Error())
	}

	assert.Equal(t, "test", res)
}

func TestGetURLParamUint(t *testing.T) {
	r := httptest.NewRequest("POST", "/api/1", nil)

	// set the context for testing
	rctx := chi.NewRouteContext()
	routeParams := &chi.RouteParams{}

	routeParams.Add("name", "1")

	rctx.URLParams = *routeParams

	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	res, err := requestutils.GetURLParamUint(r, "name")

	if err != nil {
		t.Fatalf("[ GetURLParamUint ] returneed an error when no error was expected, %v", err.Error())
	}

	assert.Equal(t, uint(1), res)
}
