# Porter
Porter is a **dashboard for Helm** with support for the following features:
- Visualization of all Helm releases with filtering by namespace
- In-depth view of releases, including revision histories and component graphs
- Rollback/update of existing releases, including editing of `values.yaml`

![Graph View](https://user-images.githubusercontent.com/65516095/96605367-221abe00-12c4-11eb-8915-25e70fe7929a.png)
**What's next for Porter?** View our [roadmap](https://github.com/porter-dev/porter/projects/1), or read our [mission statement](#mission-statement). 

## Quick Start

To view the dashboard locally, follow the instructions to install the latest CLI release for [Mac](#mac-installation), [Linux](#linux-installation), or [Windows](#windows-installation). Then, run:

```sh
porter start
```

When prompted, enter the admin email/password you would like to use. After the server has started, go to `localhost:8080/login` and **log in with the credentials you just set**. 

To view more detailed setup instructions, please consult the [getting started](docs/GETTING_STARTED.md) docs.

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

Go [here](https://github.com/porter-dev/porter/releases/latest/download/porter_0.1.0-beta.1_Windows_x86_64.zip
) to download the Windows executable and add the binary to your `PATH`. 

## Differences from Kubeapps

As a disclaimer, we're big fans of [Kubeapps](https://github.com/kubeapps/kubeapps), and many of the initial features that we build out will be very similar. Currently, Porter's graph-based chart visualization is the only fundamental difference, and it should be assumed that most Kubeapps features will be supported on Porter in the near future. However, on the feature side, Porter will eventually support:
- IDE-like tooling for chart creation, templating, and packaging
- Deep integration with GitOps workflows and CI/CD tools
- Visualization of lifecycle hooks and robust error tracing for deployments

## Mission Statement

**`kubectl` for your fundamental operations. Porter for everything else.**

Our mission is to be the go-to tool for interacting with complex Kubernetes deployments as both a beginner and an expert. While our initial focus is on visualizing Helm components, we believe this visualization and editing can be extended to a number of other tools and concepts, including alternative templating tools (kustomize, Terraform), other deployment tools (CI/CD tools, Terraform), Kubernetes package repositories (ChartMuseum, JFrog Artifactory), and even popular Kubernetes packages (nginx-ingress, cert-manager, prometheus, velero). 

More specifically, we have the following long-term goals:
- **Design a visual interface for complex deployments and operations**
- **Make deployments and operations editable by and accessible for non-Kubernetes experts**
- **Improve the development experience for packaging and releasing Kubernetes applications**
- **Increase interoperability of Kubernetes tooling without compromising usability**

Why did we begin with Helm? Helm is the most popular auxiliary Kubernetes tool, and can function in nearly all parts of deployment lifecycle. We think of the various features of Helm in the following manner, adapted from [Brian Grant's Helm Summit talk](https://www.youtube.com/watch?v=F-TlC8nIz8s) (slides [here](https://docs.google.com/presentation/d/10dp4hKciccincnH6pAFf7t31s82iNvtt_mwhlUbeCDw/edit#slide=id.g32690131a8_0_5)): package management, dependency management, application metadata, parameterization, templating, deployment/config revision management, lifecycle management hooks, and application probes. Along with these fundamental features, an expanding number of [command plugins](https://helm.sh/docs/community/related/#helm-plugins) for more specific use-cases have started to become popular in the Helm ecosystem. If we can build a better workflow for both application developers and application operators by improving the user experience for most of these Helm features, we can generalize and expand this workflow to support alternative tooling that exists in the [Kubernetes application management ecosystem](https://docs.google.com/spreadsheets/d/1FCgqz1Ci7_VCz_wdh8vBitZ3giBtac_H8SBw4uxnrsE/edit#gid=0). 
