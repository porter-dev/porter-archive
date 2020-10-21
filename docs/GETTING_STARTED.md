## Getting Started

- [Prerequisites](#prerequisites)
- [Installing](#installing)
    - [Mac Installation](#mac-installation)
    - [Linux Installation](#linux-installation)
    - [Windows Installation](#windows-installation)
- [Local Setup](#local-setup)
    - [Passing `kubeconfig` explicitly](#passing-kubeconfig-explicitly)
    - [Passing a context list](#passing-a-context-list)
    - [Skipping initialization steps](#skipping-initialization-steps)

### Prerequisites

You must have access to a Kubernetes cluster with Helm charts installed and the Docker engine must be running on your machine. 

### Installing 

#### Mac Installation

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

#### Linux Installation

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

#### Windows Installation

Go [here](https://github.com/porter-dev/porter/releases/latest/download/porter_0.1.0-beta.1_Windows_x86_64.zip
) to download the Windows executable and add the binary to your `PATH`. 

### Local Setup

> **Note:** the local setup process is tracked in [issue #60](https://github.com/porter-dev/porter/issues/60), while the overall onboarding flow is tracked in [issue #50](https://github.com/porter-dev/porter/issues/50). 

To view Porter locally, you must have access to a Kubernetes cluster with Helm charts installed. The simplest way to run Porter is via `porter start`. This command will read the `current-context` that's set in your default `kubeconfig` (either by reading the `$KUBECONFIG` env variable or reading from `$HOME/.kube/config`). To view all options for `start`, type `porter start --help`. By default, the command performs the following steps:

1. Requests an admin account is created and writes the result to the local keychain (Mac), wincred (Windows), or pass (Linux). 
2. Reads the default `kubeconfig` and populates certificates required by the current context. 
3. Starts Porter as a Docker container with a persistent storage volume attached (by default, the volume will be called `porter_sqlite`).

#### Passing `kubeconfig` explicitly

You can pass a path to a `kubeconfig` file explicitly via:

```sh
porter start --kubeconfig path/to/kubeconfig
```

#### Passing a context list

You can initialize Porter with a set of contexts by passing a context list to start. The contexts that Porter will be able to access are the same as `kubectl config get-contexts`. For example, if I had two contexts named `minikube` and `staging`, I would be able to visualize both of them via:

```sh
porter start --contexts minikube --contexts staging
```

#### Skipping Initialization Steps

To skip setting the admin account and/or the kubeconfig, `porter start` provides the `--insecure` and `--skip-kubeconfig` options.