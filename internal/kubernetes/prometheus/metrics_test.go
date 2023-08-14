package prometheus

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_getNginxStatusQuery(t *testing.T) {
	type input struct {
		opts           *QueryOpts
		selectionRegex string
	}
	type output struct {
		query string
		err   error
	}

	var tests = []struct {
		name     string
		input    input
		expected struct {
			query string
			err   error
		}
	}{
		{
			"missing status level",
			input{
				&QueryOpts{},
				"process-app-web",
			},
			output{
				"",
				errors.New("invalid nginx status level specified"),
			},
		},
		{
			"invalid status level",
			input{
				&QueryOpts{
					NginxStatusLevel: 18,
				},
				"process-app-web",
			},
			output{
				"",
				errors.New("invalid nginx status level specified"),
			},
		},
		{
			"valid status level",
			input{
				&QueryOpts{
					Name:             "process-app-web",
					Namespace:        "app-namespace",
					NginxStatusLevel: 2,
				},
				"process-app-web",
			},
			output{
				`round(sum by (ingress)(irate(nginx_ingress_controller_requests{exported_namespace=~"app-namespace",ingress="process-app-web",service="process-app-web",status=~"2.."}[5m])), 0.001)`,
				nil,
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query, err := getNginxStatusQuery(tt.input.opts, tt.input.selectionRegex)
			if tt.expected.err == nil {
				assert.Nil(t, err, "expected nil, got %v", err)
				assert.Equal(t, tt.expected.query, query, "got %s, want %s", query, tt.expected.query)
			} else {
				if assert.Error(t, err) {
					assert.Equal(t, tt.expected.err, err)
				}
			}
		})
	}
}
