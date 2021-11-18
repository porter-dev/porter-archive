package dynamic

import (
	"context"

	"github.com/porter-dev/porter/internal/templater/utils"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"k8s.io/client-go/dynamic"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// TemplateWriter satisfies the templater.TemplateWriter interface
// by creating/updating dynamic k8s resources
type TemplateWriter struct {
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

// NewDynamicTemplateWriter returns a dynamic TemplateWriter
func NewDynamicTemplateWriter(
	client dynamic.Interface,
	obj *Object,
	base map[string]interface{},
) *TemplateWriter {
	w := &TemplateWriter{
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

// Transform merges base configuration with vals
func (w *TemplateWriter) Transform() error {
	w.vals = utils.CoalesceValues(w.base, w.vals)

	return nil
}

// Create creates a new dynamic resource, this must be registered with the API server
func (w *TemplateWriter) Create(vals map[string]interface{}) (map[string]interface{}, error) {
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

// Update performs an update operation on a k8s resource. The resource must be
// registered with the API server.
func (w *TemplateWriter) Update(vals map[string]interface{}) (map[string]interface{}, error) {
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

// Delete deletes a dynamic resource, this must be registered with the API server
func (w *TemplateWriter) Delete() error {
	return w.resource.Delete(context.TODO(), w.Object.Name, metav1.DeleteOptions{})
}
