package forms

import (
	"github.com/porter-dev/porter/internal/kubernetes/prometheus"
)

// MetricsQueryForm is the form for querying pod usage metrics (cpu, memory)
type MetricsQueryForm struct {
	*K8sForm

	*prometheus.QueryOpts
}
