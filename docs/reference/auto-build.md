# Auto Build with Cloud Native Buildpacks

Porter uses [Cloud Native Buildpacks](https://buildpacks.io/docs/) to build applications from source when no Dockerfile is present. By default, the `heroku/buildpacks:18` builder is used to provide maximum parity with Heroku's auto build process.

In order for auto build to work correctly, certain basic expectations must be met at the application-level (for instance, NodeJS apps should specify a start command in `npm start`).

For reference, here is a list of supported language runtimes along with Heroku's language-specific buildpack documentation for the Heroku-18 Stack:

| Buildpack | Requirements |
|:----------|:-------------|
| [Ruby](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-ruby) | [Requirements](https://devcenter.heroku.com/articles/ruby-support) |
| [Node.js](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-nodejs) | [Requirements](https://devcenter.heroku.com/articles/nodejs-support) |
| [Python](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-python) | [Requirements](https://devcenter.heroku.com/articles/python-support) |
| [Java](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-java) | [Requirements](https://devcenter.heroku.com/articles/java-support) |
| [PHP](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-php) | [Requirements](https://devcenter.heroku.com/articles/php-support) |
| [Go](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-go) | [Requirements](https://devcenter.heroku.com/articles/go-support) |

# CI/CD with GitHub Actions

Porter uses [GitHub Actions](https://docs.github.com/en/actions) to automatically set up CI/CD within a connected GitHub repo. By default, services running on Porter will update with each push to the repo's main branch.

Porter creates the following GitHub secrets in a connected repo:

| Secret Name | Secret Value |
|:------------|:-------------|
| **ENV_<TEMPLATE_NAME>** | Contains the environment variables created through the Porter dashboard. |
| **PORTER\_TOKEN\_<PROJECT_ID>** | Porter auth credentials |
| **WEBHOOK_<TEMPLATE_NAME>** | Webhook ID for triggering a redeploy of the connected application. |

Porter will also write a file to `.github/workflows/porter_<template_name>.yaml` in your repo to automatically configure a GitHub Actions workflow.

The general structure of this GitHub Actions workflow file is as follows:

```yaml
name: Deploy to Porter
on:
  push:
    branches:
    - <MAIN_BRANCH>
jobs:
  porter-deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v2.3.4
    - name: Download Porter
      id: download_porter
      run: |2
        name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*/porter_.*_Linux_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")
        name=$(basename $name)
        curl -L https://github.com/porter-dev/porter/releases/latest/download/$name --output $name
        unzip -a $name
        rm $name
        chmod +x ./porter
        sudo mv ./porter /usr/local/bin/porter
    - name: Configure Porter
      id: configure_porter
      run: |2
        sudo porter auth login --token ${{secrets.PORTER_TOKEN_<PROJECT_ID>}}
        sudo porter docker configure
    - name: Docker build, push
      id: docker_build_push
      run: |2
        export $(echo "${{secrets.ENV_<TEMPLATE_NAME>}}" | xargs)
        sudo add-apt-repository ppa:cncf-buildpacks/pack-cli
        sudo apt-get update
        sudo apt-get install pack-cli
        sudo pack build <IMAGE_REPO>:$(git rev-parse --short HEAD) --path ./ --builder heroku/buildpacks:18
        sudo docker push <IMAGE_REPO>:$(git rev-parse --short HEAD)
    - name: Deploy on Porter
      id: deploy_porter
      run: |2
        curl -X POST "https://dashboard.getporter.dev/api/webhooks/deploy/${{secrets.WEBHOOK_<TEMPLATE_NAME>}}?commit=$(git rev-parse --short HEAD)&repository=<IMAGE_REPO>"
```

**Note:** You can edit this file as desired or manually trigger the generated redeploy webhook to configure CI/CD.

# Language Specific Notes

## Node.JS

* If you want to specify the node.js version, use the `engines` directive in your `package.json`.  By default, Node.js v12 will be used. You can use ranges or wildcards, but do not include the "v" in a version, eg:

```json
  "engines": {
    "node": "14.x"
  },
```