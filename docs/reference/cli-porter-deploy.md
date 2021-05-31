> 🚧 Beta Notice
> 
> **Note:** `porter deploy` was introduced in version `0.4.0` and is currently in `beta`, thus it is subject to change and may not work reliably. If you encounter an error, please [file a bug report](https://github.com/porter-dev/porter/issues/new?assignees=&labels=&template=bug.md). 

Version `0.4.0` of Porter added supported for building and re-deploying an existing application using the Porter CLI. For example, the following command will re-deploy an application called `example-app` from the most recent Github commit in the specified branch/repository:

```sh
porter deploy --app example-app
```

The default behavior of `porter deploy` is to **use the remote repository as the source of truth**. If you would like to use a local directory (such as your current working directory) as the directory to build from, go to the [deploying from local source]() section.

By default, this command performs four steps: gets the environment variables for the application, builds a new Docker container from the source files, pushes a new Docker image to the remote registry, and calls the Porter webhook to re-deploy the application. However, we designed this command to be modular: if you would like to add intermediate steps in your own build process, you can call different `porter deploy` sub-commands separately:

- `porter deploy get-env` - prints the build environment variables to the terminal or a file.  
- `porter deploy build` - builds the Docker container used for deployment.
- `porter deploy push` - pushes the Docker container used for deployment to a remote registry.
- `porter deploy call-webhook` - calls the Porter webhook to trigger a re-deploy of the application. 

To see a working example, check out the [creating a custom CI pipeline]() guide.

### `porter deploy`

### `porter deploy get-env`

### `porter deploy build`

### `porter deploy push`

### `porter deploy call-webhook`

## Deploying from Local Source

You can choose to deploy from your local filesystem by using the `--local` flag:

```sh
porter deploy --app example-app --local
```

This will by default read from the directory that the `porter` command is called from. If you would like to specify a different directory, use the `--path` flag:

```sh
porter deploy --app example-app --local --path ~/porter/porter-example
```
