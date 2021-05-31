## `porter deploy`

> 🚧 Beta Notice
> 
> **Note:** `porter deploy` was introduced in version `0.4.0` and is currently in `beta`, thus it is subject to change and may not work reliably. If you encounter an error, please [file a bug report](https://github.com/porter-dev/porter/issues/new?assignees=&labels=&template=bug.md). 

Version `0.4.0` of Porter added supported for building and re-deploying an existing application using the Porter CLI. For example, if you have chosen to "Deploy from a Git Repository" on the Porter dashboard, the following command will re-deploy an application called `example-app` from the most recent Github commit in the specified branch/repository:

```sh
porter deploy --app example-app
```

If you would like to use a local directory (such as your current working directory) as the directory to build from, go to the [deploying from local source](#deploying-from-local-source) section.

By default, this command performs four steps: gets the environment variables for the application, builds a new Docker container from the source files, pushes a new Docker image to the remote registry, and calls the Porter webhook to re-deploy the application. However, we designed this command to be modular: if you would like to add intermediate steps in your own build process, you can call different `porter deploy` sub-commands separately:

- [`porter deploy get-env`](#porter-deploy-get-env) - prints the build environment variables to the terminal or a file.  
- [`porter deploy build`](#porter-deploy-build) - builds the Docker container used for deployment.
- [`porter deploy push`](#porter-deploy-push) - pushes the Docker container used for deployment to a remote registry.
- [`porter deploy call-webhook`](#porter-deploy-call-webhook) - calls the Porter webhook to trigger a re-deploy of the application. 

To see a working example, check out the [creating a custom CI pipeline]() guide.

## Command Reference

### `porter deploy`

Builds and deploys a specified application given by the `--app` flag. For example:

```sh
porter deploy --app example-app
```

If the application has a remote Git repository source configured, this command uses the latest commit from the remote repo and branch to deploy an application. It will use the latest commit as the image tag. 

To build from a local directory, you must specify the `--local` flag. The path can be configured via the `--path` flag. You can also overwrite the tag using the `--tag` flag. For example, to build from the local directory `~/path-to-dir` with the tag `testing`:

```sh
porter deploy --app remote-git-app --local --path ~/path-to-dir --tag testing
```

If your application is set up to use a Dockerfile by default, you can use a buildpack via the flag `--method pack`. Conversely, if your application is set up to use a buildpack by default, you can use a Dockerfile by passing the flag `--method docker`. You can specify the relative path to a Dockerfile in your remote Git repository. For example, if a Dockerfile is found at `./docker/prod.Dockerfile`, you can specify it as follows:

```sh
porter deploy --app remote-git-app --method docker --dockerfile ./docker/prod.Dockerfile
```

If an application does not have a remote Git repository source, this command will attempt to use a cloud-native buildpack builder and build from the current directory. If this is the desired behavior, you do not need to configure additional flags:

```sh
porter deploy --app local-git-app
```

If you would like to build from a Dockerfile instead, use the flag `--dockerfile` and `--method docker` as documented above. For example:

```sh
porter deploy --app local-docker-app --method docker --dockerfile ~/porter-test/prod.Dockerfile
```

### `porter deploy get-env`

Gets environment variables for a deployment for a specified application given by the `--app` flag. By default, env variables are printed via stdout for use in downstream commands:

```sh
porter deploy get-env --app example-app | xargs
```

Output can also be written to a dotenv file via the `--file` flag, which should specify the destination path for a `.env` file. For example:

```sh
porter deploy get-env --app example-app --file .env
```

### `porter deploy build`

Builds a new version of the application specified by the `--app` flag. Depending on the configured settings, this command may work automatically or will require a specified `--method` flag. 

If you have configured the Dockerfile path and/or a build context for this application, this command will by default use those settings, so you just need to specify the `--app` flag:

```sh
porter deploy build --app example-app
```

If you have not linked the build-time requirements for this application, the cloud-native buildpacks builder will automatically be run from the current directory. If you would like to change the build method, you can do so by using the `--method` flag, for example:

```sh
porter deploy build --app example-app --method docker
```

When using `--method docker`, you can specify the path to the Dockerfile using the `--dockerfile` flag. This will also override the Dockerfile path that you may have linked for the application:

```sh
porter deploy build --app example-app --method docker --dockerfile ./prod.Dockerfile
```

### `porter deploy push`

Pushes a new image for an application specified by the `--app` flag. This command uses the image repository saved in the application config by default. For example, if an application `nginx` was created from the image repo `gcr.io/snowflake-123456/nginx`, the following command would push the image `gcr.io/snowflake-123456/nginx:new-tag`:

```sh
porter deploy push --app nginx --tag new-tag
```

This command will not use your pre-saved authentication set up via `docker login`, so if you are using an image registry that was created outside of Porter, make sure that you have linked it via `porter connect`.

### `porter deploy call-webhook`

Calls the webhook for an application specified by the --app flag. This webhook will trigger a new deployment for the application, with the new image set. For example:

```sh
porter deploy call-webhook --app example-app
```

This command will by default call the webhook with image tag "latest," but you can specify a different tag with the --tag flag:

```sh
porter deploy call-webhook --app example-app --tag custom-tag
```

# Deploying from Local Source

You can choose to deploy from your local filesystem by using the `--local` flag:

```sh
porter deploy --app example-app --local
```

This will by default read from the directory that the `porter` command is called from. If you would like to specify a different directory, use the `--path` flag:

```sh
porter deploy --app example-app --local --path ~/porter/porter-example
```
