package preview

import (
	"fmt"

	"github.com/porter-dev/switchboard/pkg/types"
)

type dependencyResolver struct {
	resources  []*types.Resource
	graph      map[string][]string
	resolved   map[string]bool
	unresolved map[string]bool
}

func newDependencyResolver(resources []*types.Resource) *dependencyResolver {
	return &dependencyResolver{
		resources:  resources,
		graph:      make(map[string][]string),
		resolved:   make(map[string]bool),
		unresolved: make(map[string]bool),
	}
}

func (r *dependencyResolver) Resolve() error {
	if len(r.resources) > 0 {
		// construct dependency graph
		for _, resource := range r.resources {
			// check for duplicate resource
			if _, ok := r.graph[resource.Name]; ok {
				return fmt.Errorf("duplicate resource detected: '%s'", resource.Name)
			}

			r.graph[resource.Name] = append(r.graph[resource.Name], resource.DependsOn...)
		}

		for _, resource := range r.resources {
			err := r.depResolve(resource.Name)

			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (r *dependencyResolver) depResolve(name string) error {
	r.unresolved[name] = true

	for _, dep := range r.graph[name] {
		if _, ok := r.graph[dep]; !ok {
			return fmt.Errorf("for resource '%s': invalid dependency '%s'", name, dep)
		}

		if _, ok := r.resolved[dep]; !ok {
			if _, ok = r.unresolved[dep]; ok {
				return fmt.Errorf("circular depedency detected: '%s' -> '%s'", name, dep)
			}
			err := r.depResolve(dep)
			if err != nil {
				return err
			}
		}
	}

	r.resolved[name] = true
	delete(r.unresolved, name)

	return nil
}
