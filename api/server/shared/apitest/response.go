package apitest

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/porter-dev/porter/api/types"
	"github.com/stretchr/testify/assert"
)

func AssertResponseExpected(t *testing.T, rr *httptest.ResponseRecorder, expResponse interface{}, gotTarget interface{}) {
	err := json.NewDecoder(rr.Body).Decode(gotTarget)

	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(
		t,
		expResponse,
		gotTarget,
		"incorrect response data",
	)
}

func AssertResponseForbidden(t *testing.T, rr *httptest.ResponseRecorder) {
	reqErr := &types.ExternalError{}
	err := json.NewDecoder(rr.Result().Body).Decode(reqErr)

	if err != nil {
		t.Fatal(err)
	}

	expReqErr := &types.ExternalError{
		Error: "Forbidden",
	}

	assert.Equal(t, http.StatusForbidden, rr.Result().StatusCode, "status code should be forbidden")
	assert.Equal(t, expReqErr, reqErr, "body should be forbidden error")
}

func AssertResponseInternalServerError(t *testing.T, rr *httptest.ResponseRecorder) {
	reqErr := &types.ExternalError{}
	err := json.NewDecoder(rr.Result().Body).Decode(reqErr)

	if err != nil {
		t.Fatal(err)
	}

	expReqErr := &types.ExternalError{
		Error: "An internal error occurred.",
	}

	assert.Equal(t, http.StatusInternalServerError, rr.Result().StatusCode, "status code should be internal server error")
	assert.Equal(t, expReqErr, reqErr, "body should be internal server error")
}

func AssertResponseError(t *testing.T, rr *httptest.ResponseRecorder, statusCode int, expReqErr *types.ExternalError) {
	reqErr := &types.ExternalError{}
	err := json.NewDecoder(rr.Result().Body).Decode(reqErr)

	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, statusCode, rr.Result().StatusCode, "status code should match")
	assert.Equal(t, expReqErr, reqErr, "body should be matching error")
}
