package requestutils_test

import (
	"bytes"
	"fmt"
	"io"
	"io/ioutil"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-test/deep"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/stretchr/testify/assert"
)

type decoderJSONTest struct {
	description  string
	decodeObj    interface{}
	getBody      func() io.ReadCloser
	expErr       bool
	expErrString string
	expObj       interface{}
}

type decoderTestObj struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

const (
	jsonFieldErrFmt  = "Invalid type for body param %s: expected %s, got %s"
	jsonSyntaxErrFmt = "JSON syntax error at character %d"
	jsonGenericErr   = "Could not parse JSON request"
)

func getSuccessfulJSONBody() io.ReadCloser {
	return ioutil.NopCloser(bytes.NewReader([]byte("{\"id\":2,\"name\":\"ok\"}")))
}

func getUnreadableJSONBody() io.ReadCloser {
	return ioutil.NopCloser(bytes.NewReader([]byte("{\"bad\":\"json\"")))
}

func getMalformedJSONBody() io.ReadCloser {
	return ioutil.NopCloser(bytes.NewReader([]byte("{\"bad\":json}")))
}

func getTypeErrorJSONBody() io.ReadCloser {
	return ioutil.NopCloser(bytes.NewReader([]byte("{\"id\":\"string\",\"name\":\"ok\"}")))
}

var decoderJSONTests = []decoderJSONTest{
	{
		description:  "Should throw error on malformed JSON with failing offset chart",
		decodeObj:    &decoderTestObj{},
		getBody:      getMalformedJSONBody,
		expErr:       true,
		expErrString: fmt.Sprintf(jsonSyntaxErrFmt, 8),
	},
	{
		description:  "Should throw error on un-parsable JSON (curly bracket missing)",
		decodeObj:    &decoderTestObj{},
		getBody:      getUnreadableJSONBody,
		expErr:       true,
		expErrString: fmt.Sprintf(jsonGenericErr),
	},
	{
		description:  "Should throw descriptive type error",
		decodeObj:    &decoderTestObj{},
		getBody:      getTypeErrorJSONBody,
		expErr:       true,
		expErrString: fmt.Sprintf(jsonFieldErrFmt, "id", "uint", "string"),
	},
	{
		description: "Should decode successfully",
		decodeObj:   &decoderTestObj{},
		getBody:     getSuccessfulJSONBody,
		expErr:      false,
		expObj: &decoderTestObj{
			ID:   2,
			Name: "ok",
		},
	},
}

func TestJSONDecoding(t *testing.T) {
	assert := assert.New(t)
	decoder := requestutils.NewDefaultDecoder()

	for _, test := range decoderJSONTests {
		testReq := httptest.NewRequest("POST", "/test/post", test.getBody())
		err := decoder.Decode(test.decodeObj, testReq)

		assert.Equal(
			err != nil,
			test.expErr,
			"[ %s ]: expected error was %t, got %t",
			test.description,
			err != nil,
			test.expErr,
		)

		if err != nil && test.expErr {
			readableStr := err.Error()
			expReadableStr := test.expErrString

			assert.Equal(
				expReadableStr,
				readableStr,
				"[ %s ]: readable string not equal",
				test.description,
			)

			// check that external and internal errors are returned as well
			assert.Equal(
				400,
				err.GetStatusCode(),
				"[ %s ]: status code not equal",
				test.description,
			)
		} else if !test.expErr {
			if diff := deep.Equal(test.expObj, test.decodeObj); diff != nil {
				t.Errorf("request object not equal:")
				t.Error(diff)
			}
		}
	}
}

type decoderSchemaTest struct {
	description  string
	decodeObj    interface{}
	queryStr     string
	expErr       bool
	expErrString string
	expObj       interface{}
}

type decoderSchemaTestObj struct {
	ClusterID uint   `schema:"cluster_id,required"`
	Storage   string `schema:"storage"`
}

const (
	invalidSchemaTypeErrFmt = "Invalid type for query param %s: expected %s"
	emptySchemaErrFmt       = "Query param %s cannot be empty"
	unknownQueryErrFmt      = "Unknown query param %s"
)

var decoderSchemaTests = []decoderSchemaTest{
	{
		description:  "Should throw error with malformed type",
		decodeObj:    &decoderSchemaTestObj{},
		queryStr:     "cluster_id=notid",
		expErr:       true,
		expErrString: fmt.Sprintf(invalidSchemaTypeErrFmt, "cluster_id", "uint"),
	},
	{
		description:  "Should throw error if param is empty",
		decodeObj:    &decoderSchemaTestObj{},
		queryStr:     "",
		expErr:       true,
		expErrString: fmt.Sprintf(emptySchemaErrFmt, "cluster_id"),
	},
	{
		description:  "Should throw error if query param is unknown",
		decodeObj:    &decoderSchemaTestObj{},
		queryStr:     "unknown=yes&cluster_id=2",
		expErr:       true,
		expErrString: fmt.Sprintf(unknownQueryErrFmt, "unknown"),
	},
	{
		description: "Should throw multiple errors",
		decodeObj:   &decoderSchemaTestObj{},
		queryStr:    "unknown=yes&cluster_id=notid",
		expErr:      true,
		expErrString: strings.Join([]string{
			fmt.Sprintf(unknownQueryErrFmt, "unknown"),
			fmt.Sprintf(invalidSchemaTypeErrFmt, "cluster_id", "uint"),
		}, ","),
	},
	{
		description: "Should decode successfully",
		decodeObj:   &decoderSchemaTestObj{},
		queryStr:    "cluster_id=2&storage=secret",
		expErr:      false,
		expObj: &decoderSchemaTestObj{
			ClusterID: 2,
			Storage:   "secret",
		},
	},
}

func TestSchemaDecoding(t *testing.T) {
	assert := assert.New(t)
	decoder := requestutils.NewDefaultDecoder()

	for _, test := range decoderSchemaTests {
		testReq := httptest.NewRequest("POST", "/test/post?"+test.queryStr, nil)
		err := decoder.Decode(test.decodeObj, testReq)

		assert.Equal(
			err != nil,
			test.expErr,
			"[ %s ]: expected error was %t, got %t",
			test.description,
			err != nil,
			test.expErr,
		)

		if err != nil && test.expErr {
			readableStrArr := strings.Split(err.Error(), ",")
			expReadableStrArr := strings.Split(test.expErrString, ",")

			assert.ElementsMatch(
				expReadableStrArr,
				readableStrArr,
				"[ %s ]: readable string not equal",
				test.description,
			)

			// check that external and internal errors are returned as well
			assert.Equal(
				400,
				err.GetStatusCode(),
				"[ %s ]: status code not equal",
				test.description,
			)
		} else if !test.expErr {
			if diff := deep.Equal(test.expObj, test.decodeObj); diff != nil {
				t.Errorf("request object not equal:")
				t.Error(diff)
			}
		}
	}
}

func TestDecodingNilParams(t *testing.T) {
	decoder := requestutils.NewDefaultDecoder()

	err := decoder.Decode(nil, nil)
	expErr := apierrors.NewErrInternal(fmt.Errorf("decode: request or request.URL cannot be nil"))

	// check that error type is of type apierrors.RequestError and that
	// message is correct
	assert.EqualError(t, err, expErr.Error(), "nil param error not internal server error")

	var expErrTarget apierrors.RequestError
	assert.ErrorAs(t, err, &expErrTarget)

	testReq := httptest.NewRequest("POST", "/test/post", nil)
	err = decoder.Decode(nil, testReq)
	expErr = apierrors.NewErrInternal(fmt.Errorf("schema: interface must be a pointer to struct"))

	// check that error type is of type apierrors.RequestError and that
	// message is correct
	assert.EqualError(t, err, expErr.Error(), "nil param error not internal server error")

	var expErrTarget2 apierrors.RequestError
	assert.ErrorAs(t, err, &expErrTarget2)
}
