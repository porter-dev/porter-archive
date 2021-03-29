## Getting Started

- [Prerequisites](#prerequisites)
- [Installing](#installing)
  - [Mac Installation](#mac-installation)
  - [Linux Installation](#linux-installation)
  - [Windows Installation](#windows-installation)
- [Local Setup](#local-setup)
  - [Connecting to a Cluster](#connecting-to-a-cluster)

## Prerequisites

You must have access to a Kubernetes cluster with Helm charts installed and the Docker engine must be running on your machine. To quickly get a local Kubernetes cluster set up, following the instructions for [installing minikube](https://minikube.sigs.k8s.io/docs/start/), and make sure that minikube is set as the current context by ensuring the output of `kubectl config current-context` is `minikube`.

## Installing

### Mac Installation

Run the following command to grab the latest binary:

```sh
{
name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*_Darwin_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")
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

### Linux Installation

Run the following command to grab the latest binary:

```sh
{
name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*_Linux_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")
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

### Windows Installation

Go [here](https://github.com/porter-dev/porter/releases/latest/download/porter_0.1.0-beta.1_Windows_x86_64.zip) to download the Windows executable and add the binary to your `PATH`.

## Local Setup

> **Note:** the local setup process is tracked in [issue #60](https://github.com/porter-dev/porter/issues/60), while the overall onboarding flow is tracked in [issue #50](https://github.com/porter-dev/porter/issues/50).

To view Porter locally, you must have access to a Kubernetes cluster with Helm charts installed. The simplest way to run Porter is via `porter server start`. After doing this, you can go to `http://localhost:8080` to register an account and create a project manually. Alternatively, you can run the following commands:

```sh
porter auth register
porter project create porter-test
```

### Connecting to a Cluster

In the case of local setup, you will have to connect to a cluster using the CLI command `porter connect kubeconfig`. By default, this command will read the `current-context` that's set in your default `kubeconfig` (either by reading the `$KUBECONFIG` env variable or reading from `$HOME/.kube/config`). You can also pass a path to a kubeconfig file explicitly (see below).

The Porter CLI will attempt to generate a working kubeconfig for many types of cluster configurations and auth mechanisms, even though the necessary commands and/or certificates will not be present in the Porter container. The CLI will attempt the following resolutions:

1. If a kubeconfig requires cluster CA data via the `certificate-authority` field, the CA data will be automatically populated.
2. If a kubeconfig requires client cert data via the `client-certificate` field, the certificate data will be automatically populated.
3. If a kubeconfig requires client key data via the `client-key` field, the key data will be automatically populated.
4. If a kubeconfig requires a custom `oidc` auth mechanism, and this mechanism requires OIDC issuer CA data via the `idp-certificate-authority` field, the CA data will be automatically populated.
5. If a kubeconfig requires a bearer token to be read from a `token-file` field, the token data will be automatically populated.
6. If a kubeconfig requires a custom `gcp` auth mechanism (for connecting with GKE clusters), the CLI will require a GCP `service-account` that has permissions to read from the GKE cluster. The CLI will ask the user if it can set this up automatically: if so, it will automatically detect the correct GCP project ID and will create a service account and download a key file. If the user does not wish the CLI to set this up automatically, the user will need to provide a file path to a service account key file that was downloaded from GCloud.

> **Note:** AWS EKS support coming soon.

#### Passing `kubeconfig` explicitly

You can pass a path to a `kubeconfig` file explicitly via:

```sh
porter connect kubeconfig --kubeconfig path/to/kubeconfig
```

#### Passing a context list

You can initialize Porter with a set of contexts by passing a context list to start. The contexts that Porter will be able to access are the same as `kubectl config get-contexts`. For example, if there are two contexts named `minikube` and `staging`, you could connect both of them via:

```sh
porter connect kubeconfig --context minikube --context staging
```
