export const overrideObjectValues = (obj1: any, obj2: any) => {
    // Iterate over the keys in obj2
    for (const key in obj2) {
        // Check if the key exists in obj1 and if its value is an object
        if (key in obj1 && typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
            // Recursively call the function to handle the nested object
            obj1[key] = overrideObjectValues(obj1[key], obj2[key]);
        } else {
            // Otherwise, just assign the value from obj2 to obj1
            obj1[key] = obj2[key];
        }
    }

    // Return the merged object
    return obj1;
};

export const getGithubAction = (projectID?: number, stackName?: string) => {
    return `on:
  push:
    branches:
    - master
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
    - name: Deploy stack
      timeout-minutes: 30
      uses: porter-dev/porter-cli-action@v0.1.0
      with:
        command: apply -f porter.yaml
      env:
        PORTER_CLUSTER: "1"
        PORTER_HOST: https://296e-160-72-72-58.ngrok-free.app
        PORTER_PROJECT: "${projectID}"
        PORTER_STACK_NAME: "${stackName}"
        PORTER_TAG: \${{ steps.vars.outputs.sha_short }}
        PORTER_TOKEN: \${{ secrets.PORTER_STACK_1_1 }}`;
}
