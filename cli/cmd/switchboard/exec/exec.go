package exec

import (
	"fmt"
	"sync"

	"github.com/porter-dev/porter/cli/cmd/switchboard/models"
)

// TODO: this exec func should probably accept channels or something
type ExecFunc func(resource *models.Resource) error

type ExecNode struct {
	isExecFinished bool
	isExecStarted  bool
	parents        []*ExecNode
	resource       *models.Resource
}

func (e *ExecNode) IsFinished() bool {
	return e.isExecFinished
}

func (e *ExecNode) SetFinished() {
	e.isExecFinished = true
}

func (e *ExecNode) IsStarted() bool {
	return e.isExecStarted
}

func (e *ExecNode) SetStarted() {
	e.isExecStarted = true
}

func (e *ExecNode) ShouldStart() bool {
	// if the exec has started or finished, return false
	if e.IsStarted() || e.IsFinished() {
		return false
	}

	// if all parents have finished execution, the exec process should start
	parentsFinished := true

	for _, parent := range e.parents {
		parentsFinished = parentsFinished && parent.IsFinished()
	}

	return parentsFinished
}

// GetExecNodes
func GetExecNodes(group *models.ResourceGroup) ([]*ExecNode, error) {
	// create a map of resource names to exec nodes
	resourceMap := make(map[string]*ExecNode)

	for _, resource := range group.Resources {
		// check that name does not already exist
		if _, exists := resourceMap[resource.Name]; exists {
			return nil, fmt.Errorf("duplicate resource name encountered for \"%s\"", resource.Name)
		}

		resourceMap[resource.Name] = &ExecNode{
			resource: resource,
			parents:  make([]*ExecNode, 0),
		}
	}

	// Now that resources are registered, iterate through the resources again
	// to find the dependencies. If a dependency does not exist, throw an error
	res := make([]*ExecNode, 0)

	for _, execNode := range resourceMap {
		for _, dependency := range execNode.resource.Dependencies {
			// check that the resource described by the dependency exists
			if _, exists := resourceMap[dependency]; !exists {
				return nil, fmt.Errorf("parent resource \"%s\" does not exist", dependency)
			}

			execNode.parents = append(execNode.parents, resourceMap[dependency])
		}

		res = append(res, execNode)
	}

	// TODO: check against circular dependencies

	return res, nil
}

// Execute simply calls exec on nodes in parallel, in batches. This could be much more
// efficient.
func Execute(nodes []*ExecNode, execFunc ExecFunc) error {
	var outErr error
	for {
		var wg sync.WaitGroup

		// get the list of nodes which are ready to execute, and execute those nodes
		for _, node := range nodes {
			nodeP := node
			if nodeP.ShouldStart() {
				wg.Add(1)

				go func() {
					defer wg.Done()

					nodeP.SetStarted()
					err := execFunc(nodeP.resource)

					if err != nil {
						outErr = err
						return
					}

					nodeP.SetFinished()
				}()
			}
		}

		if outErr != nil {
			break
		}

		wg.Wait()

		if allFinished := areAllNodesFinished(nodes); allFinished {
			break
		}
	}

	return outErr
}

func areAllNodesFinished(nodes []*ExecNode) bool {
	areFinished := true

	for _, node := range nodes {
		areFinished = areFinished && node.IsFinished()
	}

	return areFinished
}
