# Installation
## Mac 
Run the following command to grab the latest binary:

```sh
{
name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*/porter_.*_Darwin_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")
name=$(basename $name)
curl -L https://github.com/porter-dev/porter/releases/latest/download/$name --output $name
unzip -a $name
rm $name
}
```

Then move the file into your bin:

```sh
chmod +x ./porter
sudo mv ./porter /usr/local/bin/porter
```

To download a specific version of the CLI:

```sh
{
# NOTE: replace this line with the version
version=v0.6.1
name=porter-$version.zip
curl -L https://github.com/porter-dev/porter/releases/download/${version}/porter_${version}_Darwin_x86_64.zip --output $name
unzip -a $name
rm $name
chmod +x ./porter
sudo mv ./porter /usr/local/bin/porter
}
```

## Linux

Run the following command to grab the latest binary:

```sh
{
name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*/porter_.*_Linux_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")
name=$(basename $name)
curl -L https://github.com/porter-dev/porter/releases/latest/download/$name --output $name
unzip -a $name
rm $name
}
```

Then move the file into your bin:

```sh
chmod +x ./porter
sudo mv ./porter /usr/local/bin/porter
```


To download a specific version of the CLI:

```sh
{
# NOTE: replace this line with the version
version=v0.6.1
name=porter-$version.zip
curl -L https://github.com/porter-dev/porter/releases/download/${version}/porter_${version}_Linux_x86_64.zip --output $name
unzip -a $name
rm $name
chmod +x ./porter
sudo mv ./porter /usr/local/bin/porter
}
```

## Windows

Go [here](https://github.com/porter-dev/porter/releases/latest/download/porter_0.1.0-beta.1_Windows_x86_64.zip) to download the Windows executable and add the binary to your `PATH`.

# Connecting to an existing cluster
### `porter connect kubeconfig`
Connects Porter to an existing Kubernetes cluster using the `current-context` in your `kubeconfig`.

# Pushing Docker images to your Porter image registry

> 🚧 You must be logged in before configuring registry access
> 
> Please make sure you are logged in by running `porter config set-host https://dashboard.getporter.dev; porter auth login` first.

### `porter docker configure`

Writes to the local Docker `config.json` file to grant push/pull access to the image registries provisioned by Porter. Once you have run this command, you can directly use the `docker` CLI to push to the private image registry.

**Example:**

```sh
porter docker configure
docker build . -t gcr.io/project-123456/porter-server:latest
docker push gcr.io/project-123456/porter-server:latest
```

> 📘
>
> We are working to add support for additional private Docker registries. If you don't see your registry provider, send us an email at [contact@getporter.dev](mailto:contact@getporter.dev) or feel free to contribute to the [repo](https://github.com/porter-dev/porter).

# Connecting the CLI to a locally running instance of Porter

### `porter config set-host [HOST]`

Sets the URL of the Porter API server the CLI will communicate with. HOST is a URL including the protocol and defaults to `https://dashboard.getporter.dev`. 

For locally running porter instances, run:

```sh
porter config set-host http://localhost:8080
```

# Remote Execution
### `porter run [RELEASE] -- [COMMAND] [args...]`

> 🚧 Prequisites
> 
> **Note:** before running this command, you should make sure your cluster is set in your config. Run `porter clusters list` to view the list of connected clusters, and run `porter config set-cluster [ID]` to set the correct cluster in your config.

Allows users to execute a command on a remote container. The `release` variable is the name of the release on the Porter dashboard (this can be a release either in the "Applications" or the "Jobs" tab). For example, if I have a release called `web`, and I would like to enter an interactive shell in the container attached to `web`, I would run:

```sh
porter run web -- sh
```
 
To test that remote execution is working, you can run:

```sh
porter run web -- echo "hello world"
```

To run in a namespace other than `default`, use the `--namespace` flag:

```sh
porter run web --namespace other-namespace -- sh
```

# Commands

Here's a reference table for the CLI documentation:

| Command | Description |
|:------- |:------------|
| `porter config set-host [HOST]` | Sets the API server host name that the CLI will communicate with. |
| `porter auth login` | Logs in via the CLI. |
| `porter config set-project [PROJECT_ID]` | Sets the current project in config. |
| `porter connect [INTEGRATION]` | Connects Porter with the given infrastructure. Accepts `kubeconfig` and `ecr` as arguments. |
| `porter docker configure` | Grants the `docker` CLI access to a provisioned image registry. |
| `porter run [RELEASE] -- [COMMAND] [args...]` | Executes a command on a remote container, specified by the release name. |
