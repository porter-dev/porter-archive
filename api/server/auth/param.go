package auth

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
)

const urlParamNotFoundFmt = "could not find url param %s"
const urlParamErrUintConvFmt = "could not convert url parameter %s to uint, got %s"

// GetURLParamString returns a specific URL parameter as a string using
// chi.URLParam. It returns an internal server error if the URL parameter is not found.
func GetURLParamString(r *http.Request, param string) (string, apierrors.RequestError) {
	urlParam := chi.URLParam(r, param)

	if urlParam == "" {
		// this is an internal server error, since it means the handler requested an
		// invalid url parameter
		return "", apierrors.NewErrInternal(fmt.Errorf(urlParamNotFoundFmt, param))
	}

	return urlParam, nil
}

// GetURLParamUint returns a URL parameter as a uint. It returns
// an internal server error if the URL parameter is not found.
func GetURLParamUint(r *http.Request, param string) (uint, apierrors.RequestError) {
	urlParam, reqErr := GetURLParamString(r, param)

	if reqErr != nil {
		return 0, reqErr
	}

	res64, err := strconv.ParseUint(urlParam, 10, 64)

	if err != nil {
		return 0, apierrors.NewErrPassThroughToClient(
			fmt.Errorf(urlParamErrUintConvFmt, param, urlParam),
			http.StatusBadRequest,
		)
	}

	return uint(res64), nil
}
