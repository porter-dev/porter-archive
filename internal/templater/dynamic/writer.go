package dynamic

import (
	"context"

	"github.com/porter-dev/porter/cli/cmd/templater/utils"

	"github.com/porter-dev/porter/cli/cmd/templater"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"k8s.io/client-go/dynamic"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type DynamicTemplateWriter struct {
	// The object to read from, identified by its group-version-kind
	Object *Object

	Client dynamic.Interface

	// The resource that's being written to
	resource dynamic.ResourceInterface

	// The values to be written
	vals map[string]interface{}

	// The base values
	base map[string]interface{}
}

func NewDynamicTemplateWriter(
	client dynamic.Interface,
	obj *Object,
	base map[string]interface{},
) templater.TemplateWriter {
	w := &DynamicTemplateWriter{
		Object: obj,
		Client: client,
		base:   base,
	}

	objRes := schema.GroupVersionResource{
		Group:    w.Object.Group,
		Version:  w.Object.Version,
		Resource: w.Object.Resource,
	}

	w.resource = w.Client.Resource(objRes).Namespace(w.Object.Namespace)

	return w
}

func (w *DynamicTemplateWriter) Transform() error {
	w.vals = utils.CoalesceValues(w.base, w.vals)

	return nil
}

func (w *DynamicTemplateWriter) Write() (map[string]interface{}, error) {
	return nil, nil
}

func (w *DynamicTemplateWriter) Create(vals map[string]interface{}) (map[string]interface{}, error) {
	w.vals = vals
	err := w.Transform()

	if err != nil {
		return nil, err
	}

	create, err := w.resource.Create(context.TODO(), &unstructured.Unstructured{
		Object: w.vals,
	}, metav1.CreateOptions{})

	if err != nil {
		return nil, err
	}

	return create.Object, nil
}

func (w *DynamicTemplateWriter) Update(vals map[string]interface{}) (map[string]interface{}, error) {
	w.vals = vals
	err := w.Transform()

	if err != nil {
		return nil, err
	}

	update, err := w.resource.Update(context.TODO(), &unstructured.Unstructured{
		Object: w.vals,
	}, metav1.UpdateOptions{})

	if err != nil {
		return nil, err
	}

	return update.Object, nil
}
