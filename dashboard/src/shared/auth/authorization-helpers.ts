import { HIERARCHY_TREE, PolicyDocType, ScopeType, Verbs } from "./types";

export const ADMIN_POLICY_MOCK: PolicyDocType = {
  scope: "project",
  verbs: ["get", "list", "create", "update", "delete"],
};

export const DEV_POLICY_MOCK: PolicyDocType = {
  scope: "project",
  verbs: ["get", "list", "create", "update", "delete"],
  resources: [],
  children: {
    settings: {
      scope: "settings",
      verbs: ["get", "list"],
      resources: [],
    },
  },
};

export const VIEWER_POLICY_MOCK: PolicyDocType = {
  scope: "project",
  verbs: ["get", "list"],
  resources: [],
  children: {
    integrations: {
      scope: "integrations",
      verbs: [],
      resources: [],
    },
    settings: {
      scope: "settings",
      verbs: [],
      resources: [],
    },
  },
};

export const POLICY_HIERARCHY_TREE: HIERARCHY_TREE = {
  project: {
    cluster: {
      namespace: {
        application: {},
        job: {},
        env_group: {},
      },
    },
    settings: {},
    integrations: {},
  },
};

export const isAuthorized = (
  policy: PolicyDocType,
  scope: string,
  resource: string | Array<string>,
  verb: Verbs | Array<Verbs>
): boolean => {
  if (!policy) {
    return false;
  }

  if (policy?.scope === scope) {
    let isResourceIncluded = false;
    if (policy.resources.length === 0) {
      isResourceIncluded = true;
    } else if (typeof resource === "string") {
      isResourceIncluded = policy.resources.includes(resource);
    } else {
      isResourceIncluded = resource.every((r) => policy.resources.includes(r));
    }

    return (
      isResourceIncluded &&
      (typeof verb === "string"
        ? policy.verbs.includes(verb)
        : verb.every((v) => policy.verbs.includes(v)))
    );
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

export const populatePolicy = (
  currPolicy: PolicyDocType,
  tree: HIERARCHY_TREE = POLICY_HIERARCHY_TREE,
  currentScope?: ScopeType,
  parentVerbs?: Array<Verbs>
) => {
  const scope = currentScope || currPolicy.scope;
  const verbs = parentVerbs || currPolicy.verbs;

  const currTree = tree[scope];
  const treeKeys = Object.keys(currTree) as Array<ScopeType>;

  currPolicy.children = currPolicy?.children || {};
  currPolicy.resources = currPolicy?.resources || [];

  for (const child of treeKeys) {
    let childPolicy = currPolicy?.children && currPolicy?.children[child];
    if (!childPolicy) {
      childPolicy = {
        scope: child,
        verbs: verbs,
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
