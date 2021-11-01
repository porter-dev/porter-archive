package dynamic

import (
	"context"
	"fmt"
	"time"

	"github.com/porter-dev/porter/internal/templater/utils"

	"github.com/porter-dev/porter/internal/templater"
	"k8s.io/client-go/dynamic"
	di "k8s.io/client-go/dynamic/dynamicinformer"
	"k8s.io/client-go/tools/cache"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// Object identifies a set of k8s objects, during Group-Version-Kind, and optionally
// a namespace and name to isolate a single object
type Object struct {
	Group    string
	Version  string
	Resource string

	// Optional, if resource is namespacable
	Namespace string

	// Optional, if attempting to get an object by name
	Name string
}

// TemplateReader reads any resource registered with the k8s apiserver
type TemplateReader struct {
	// The object to read from, identified by its group-version-kind
	Object *Object

	// The set of queries to execute, identified by a key and query string
	Queries []*templater.TemplateReaderQuery

	Client dynamic.Interface

	// The resource that's being queried
	gvr      schema.GroupVersionResource
	resource dynamic.ResourceInterface
}

// NewDynamicTemplateReader creates a new DynamicTemplateReader
func NewDynamicTemplateReader(client dynamic.Interface, obj *Object) templater.TemplateReader {
	r := &TemplateReader{
		Object: obj,
		Client: client,
	}

	objRes := schema.GroupVersionResource{
		Group:    r.Object.Group,
		Version:  r.Object.Version,
		Resource: r.Object.Resource,
	}

	// just case on the "core" group and unset it
	if r.Object.Group == "core" {
		objRes.Group = ""
	}

	r.gvr = objRes

	r.resource = r.Client.Resource(objRes).Namespace(r.Object.Namespace)

	return r
}

// ValuesFromTarget retrieves cluster values from the k8s apiserver
func (r *TemplateReader) ValuesFromTarget() (map[string]interface{}, error) {
	// if name is not empty, this is a get operation
	if r.Object.Name != "" {
		return r.valuesFromGet()
	}

	return r.valuesFromList()
}

// RegisterQuery adds a query to the list of queries to execute
func (r *TemplateReader) RegisterQuery(query *templater.TemplateReaderQuery) error {
	r.Queries = append(r.Queries, query)

	return nil
}

// Read returns the resulting queried data
func (r *TemplateReader) Read() (map[string]interface{}, error) {
	values, err := r.ValuesFromTarget()

	if err != nil {
		return nil, err
	}

	return utils.QueryValues(values, r.Queries)
}

// ReadStream listens for CRUD 	operations on resources and returns resulting
// queried data
func (r *TemplateReader) ReadStream(
	on templater.OnDataStream,
	stopCh <-chan struct{},
) error {
	factory := di.NewDynamicSharedInformerFactory(
		r.Client,
		10*time.Second,
	)

	informer := factory.ForResource(r.gvr).Informer()

	informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj interface{}) {
			pkt := make(map[string]interface{})
			pkt["kind"] = "create"

			u := obj.(*unstructured.Unstructured)

			queryObj := make(map[string]interface{})
			queryObj["items"] = []interface{}{u}

			data, err := utils.QueryValues(queryObj, r.Queries)

			if err != nil {
				return
			}

			fmt.Println("DATA IS", data)

			pkt["data"] = data
			on(pkt)
		},
		UpdateFunc: func(oldObj, newObj interface{}) {
			pkt := make(map[string]interface{})
			pkt["kind"] = "update"

			u := newObj.(*unstructured.Unstructured)

			data, err := utils.QueryValues(u.Object, r.Queries)

			if err != nil {
				return
			}

			pkt["data"] = data
			on(pkt)
		},
		DeleteFunc: func(obj interface{}) {
			pkt := make(map[string]interface{})
			pkt["kind"] = "delete"

			u := obj.(*unstructured.Unstructured)

			data, err := utils.QueryValues(u.Object, r.Queries)

			if err != nil {
				return
			}

			pkt["data"] = data
			on(pkt)
		},
	})

	go informer.Run(stopCh)

	return nil
}

func (r *TemplateReader) valuesFromList() (map[string]interface{}, error) {
	list, err := r.resource.List(context.TODO(), metav1.ListOptions{})

	if err != nil {
		return nil, err
	}

	return list.UnstructuredContent(), nil
}

func (r *TemplateReader) valuesFromGet() (map[string]interface{}, error) {
	get, err := r.resource.Get(context.TODO(), r.Object.Name, metav1.GetOptions{})

	if err != nil {
		return nil, err
	}

	return get.Object, nil
}
