package kubernetes

import (
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/rest"
)

// NewRESTClientGetterFromClientConfig returns a RESTClientGetter using
// default values set from the *rest.Config
func NewRESTClientGetterFromClientConfig(conf *rest.Config) genericclioptions.RESTClientGetter {
	cfs := genericclioptions.NewConfigFlags(false)

	cfs.Insecure = &conf.Insecure
	cfs.APIServer = stringptr(conf.Host)
	cfs.CAFile = stringptr(conf.CAFile)
	cfs.BearerToken = stringptr(conf.BearerToken)

	return cfs
}

func stringptr(val string) *string {
	return &val
}
