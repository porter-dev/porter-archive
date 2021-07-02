import { HIERARCHY_TREE, PolicyDocType, ScopeType, Verbs } from "./types";

export const ADMIN_POLICY_MOCK: PolicyDocType = {
  scope: "project",
  verbs: ["get", "list", "create", "update", "delete"],
  resources: [],
  children: {
    settings: {
      scope: "settings",
      verbs: [],
    },
  } as Record<ScopeType, PolicyDocType>,
};

export const isAuthorized = (
  policy: PolicyDocType,
  scope: string,
  resource: string,
  verb: Verbs | Array<Verbs>
): boolean => {
  if (!policy) {
    return false;
  }

  if (policy?.scope === scope) {
    return (policy.resources.length === 0 ||
      policy.resources.includes(resource)) &&
      typeof verb === "string"
      ? policy.verbs.includes(verb)
      : (verb as Array<Verbs>).every((v) => policy.verbs.includes(v));
  } else {
    const isValid =
      policy?.children &&
      Object.values(policy.children).reduce((prev, currentPol) => {
        if (isAuthorized(currentPol, scope, resource, verb)) {
          return true;
        } else {
          return prev || false;
        }
      }, false);

    return !!isValid;
  }
};

export const POLICY_HIERARCHY_TREE: HIERARCHY_TREE = {
  project: {
    cluster: {
      namespace: {
        application: {},
      },
    },
    settings: {},
  },
};

export const populatePolicy = (
  currPolicy: PolicyDocType,
  tree: HIERARCHY_TREE,
  currScope: ScopeType,
  parentVerbs: Array<Verbs>
) => {
  const currTree = tree[currScope];

  const treeKeys = Object.keys(currTree) as Array<ScopeType>;

  for (const child of treeKeys) {
    let childPolicy = currPolicy?.children && currPolicy?.children[child];
    if (!childPolicy) {
      childPolicy = {
        scope: child,
        verbs: parentVerbs,
        resources: [],
        children: {},
      };
    }
    childPolicy.resources = childPolicy?.resources || [];
    childPolicy.children = childPolicy?.children || {};
    currPolicy.children[child] = populatePolicy(
      childPolicy,
      currTree,
      childPolicy.scope,
      currPolicy.verbs
    );
  }

  return currPolicy;
};
