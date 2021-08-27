## Backend Refactoring

The backend refactor has four immediate goals:

- Remove repeated logic from handlers, to make handlers easier to develop and test
- Create unit tests for handlers
- Consolidate error handling and logging
- Type the API request/response/endpoints and export the types as a package

These tasks will eventually enable:

- Application monitoring and error reporting, using the conslidated error handlers and logging
- Better support with well-defined and predictable logging output
- Proper CI when developing, which can run unit tests against the backend
- Auto-generation of the API spec, using the strongly types API requests/responses

## Explanation of Scopes

This refactor abstracts authentication and authorization logic much better than the previous version of the API. The refactor is centered around the concept of _scopes_: each endpoint has a well-defined set of scopes that define which objects that the endpoint can modify or return, thereby enforcing _Role-Based Access Control_. The basic set of scopes operate in the following heirarchy:

```
             User
              |
           Project
           /      \
        Cluster   Settings
         /
    Namespace
       |
     Release
```

That is, all project routes are user-scoped (require authenticated user), all cluster scopes require a project, etc.

How do we enforce these scopes? This is the purpose of the `api/server/authz` package, where we make use of Golang's [context](https://go.dev/blog/context) to create middleware that adds resources to the context. For example, the `ProjectScopedMiddleware` object returns a handler that essentially does the following (removed fluff from code):

```go
// get the referenced project from the database
project, _ := p.config.Repo.Project().ReadProject(projID)

// add the project to the request context
ctx := NewProjectContext(r.Context(), project)
r = r.WithContext(ctx)

// call the next handler
p.next.ServeHTTP(w, r)
```

Thus, subsequent endpoint can simply call the following:

```go
proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
```

Note that **we assume the resource is populated in subsequent handlers** -- we do not check for this condition, since this is the function of the middleware.

## Migrating Existing Handlers

The steps for migrating an existing handler are as follows:

1. Create a new file in a sub-folder of `/api/server/handlers`. For example, if creating a cluster-scoped routes, add a new route to `/api/server/handlers/cluster`.
2. Add some boilerplate to this file as follows:

```go
type [Resource][Verb]Handler struct {
    // should extend one of:
    // handlers.PorterHandler
    // handlers.PorterHandlerReader
    // handlers.PorterHandlerWriter
    // handlers.PorterHandlerReaderWriter

    // TODO: add any additional fields, or embed existing structs/interfaces
}

func New[Resource][Verb]Handler(
	config *config.Config,
    // TODO: additional arguments
) *[Resource][Verb]Handler {
	return &[Resource][Verb]Handler{
        // TODO: initialize
	}
}

func (c *[Resource][Verb]Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // TODO: add handler logic here
}
```

3. Implement the handler logic, you can mostly copy the handler from `/server/api`. Perform the following:

- Replace all unnecessary lookups by finding the object in context (see above for explanation)
- Replace all error-handling with a method from `apierrors` (look at existing handlers to understand)
- Use helper methods attached to the `handlers.PorterHandler` interface, which implements the following:

```go
Config() *config.Config
Repo() repository.Repository
HandleAPIError(w http.ResponseWriter, err apierrors.RequestError)
```

4. Add the route to the corresponding file in `/api/server/router`. Each route has a corresponding endpoint and handler. For example, if creating a new cluster-scoped route, like `GET /api/projects/{project_id}/clusters/{cluster_id}`, you would add the following to `getClusterRoutes`:

```go
// GET /api/projects/{project_id}/clusters/{cluster_id} -> project.NewClusterGetHandler
getEndpoint := factory.NewAPIEndpoint(
	&types.APIRequestMetadata{
		Verb:   types.APIVerbGet,
		Method: types.HTTPVerbGet,
		Path: &types.Path{
			Parent:       basePath,
			RelativePath: relPath,
		},
		Scopes: []types.PermissionScope{
            // NOTE: important. Make sure all relevant scopes are defined: this definition will
            // automatically add the relevant middleware.
			types.UserScope,
			types.ProjectScope,
			types.ClusterScope,
		},
	},
)

getHandler := cluster.NewClusterGetHandler(
	config,
	factory.GetResultWriter(),
)

routes = append(routes, &Route{
	Endpoint: getEndpoint,
	Handler:  getHandler,
	Router:   r,
})
```
