export const overrideObjectValues = (obj1: any, obj2: any) => {
  // Iterate over the keys in obj2
  for (const key in obj2) {
    // Check if the key exists in obj1 and if its value is an object
    if (
      key in obj1 &&
      obj1[key] !== null &&
      typeof obj1[key] === "object" &&
      typeof obj2[key] === "object"
    ) {
      obj1[key] = overrideObjectValues(obj1[key], obj2[key]);
    } else {
      obj1[key] = obj2[key];
    }
  }

  // Return the merged object
  return obj1;
};

export const getGithubAction = (
  projectID: number,
  clusterId: number,
  stackName: string,
  branchName: string,
  porterYamlPath: string = "porter.yaml",
  deploymentTargetId: string = ""
): string => {
  return `on:
  push:
    branches:
    - ${branchName}
name: Deploy to Porter
jobs:
  porter-deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    - name: Set Github tag
      id: vars
      run: echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
    - name: Setup porter
      uses: porter-dev/setup-porter@v0.1.0
    - name: Deploy stack
      timeout-minutes: 30
      run: exec porter apply ${porterYamlPath ? `-f ${porterYamlPath}` : ""}
      env:
        PORTER_CLUSTER: ${clusterId}
        PORTER_HOST: https://dashboard.getporter.dev
        PORTER_PROJECT: ${projectID}
        PORTER_STACK_NAME: ${stackName}
        PORTER_TAG: \${{ steps.vars.outputs.sha_short }}
        PORTER_TOKEN: \${{ secrets.PORTER_STACK_${projectID}_${clusterId} }}
        ${
          deploymentTargetId
            ? `PORTER_DEPLOYMENT_TARGET_ID: ${deploymentTargetId}`
            : ""
        }`;
};

export const getPreviewGithubAction = ({
  projectId,
  clusterId,
  appName,
  branch,
  porterYamlPath = "porter.yaml",
}: {
  projectId: number;
  clusterId: number;
  appName: string;
  branch: string;
  porterYamlPath?: string;
}): string => {
  return `"on":
  pull_request:
    branches:
    - ${branch}
    types:
    - opened
    - synchronize
    paths:
    - '**'
    - '!.github/workflows/porter_**'
    
name: Deploy to Preview Environment
jobs:
  porter-deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    - name: Set Github tag
      id: vars
      run: echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
    - name: Setup porter
      uses: porter-dev/setup-porter@v0.1.0
    - name: Build and deploy preview environment
      timeout-minutes: 30
      run: exec porter apply -f ${porterYamlPath} --preview
      env:
        PORTER_CLUSTER: ${clusterId}
        PORTER_HOST: https://dashboard.getporter.dev
        PORTER_PROJECT: ${projectId}
        PORTER_STACK_NAME: ${appName}
        PORTER_TAG: \${{ steps.vars.outputs.sha_short }}
        PORTER_TOKEN: \${{ secrets.PORTER_STACK_${projectId}_${clusterId} }}
        PORTER_PR_NUMBER: \${{ github.event.number }}
        PORTER_REPO_NAME: \${{ github.event.repository.name }}`;
};
