/*
Package policy provides methods for parsing RBAC policies to determine if a user
has access to a given resource.

TODO: more details about policy trees + "MostRestrictiveParent" + "LeastRestrictiveSibling"

Caveats:
- one policy document to match the entire action
- list/create are not resource-specific actions, so granting list/create permissions for a scope
means that a user can list all resources or create a new resource in that scope.
*/
package policy
