# Porter

## Description

Porter is a **dashboard for Helm**. It currently provides the following features:
- Visualization of all Helm releases with filtering by namespace
- In-depth view of releases, including revision histories and component graphs
- Rollback/update of existing releases, including editing of `values.yaml`

**What's next for Porter?** View our [roadmap](#ROADMAP), or read our [mission statement](#mission-statement). 

## Getting Started

### Local Setup

To view the dashboard locally, we expose a `porter start` command via our CLI. To download the CLI, grab the latest release via:

```sh
TBD
```

And run the dashboard:

```sh
porter start
```

### In-Cluster Setup

TBD

## Alternative Tools

## Mission Statement

**`kubectl` for your fundamental operations. Porter for everything else.**

Our mission is to be the go-to tool for interacting with complex Kubernetes deployments as both a beginner and an expert. While our initial focus is on visualizing Helm components, we believe this visualization and editing can be extended to a number of other tools and concepts, including alternative templating tools (kustomize, Terraform), other deployment tools (CI/CD tools, Terraform), Kubernetes package repositories (ChartMuseum, JFrog Artifactory), and even popular Kubernetes packages (nginx-ingress, cert-manager, prometheus, velero). 

More specifically, we have the following long-term goals:
- **Design a visual interface for complex deployments and operations**
- **Make deployments and operations editable by and accessible for non-Kubernetes experts**
- **Improve the development experience for packaging and releasing Kubernetes applications**
- **Increase interoperability of Kubernetes tooling without compromising usability**

Why did we begin with Helm? Helm is the most popular auxiliary Kubernetes tool, and can function in nearly all parts of deployment lifecycle. We think of the various features of Helm in the following manner, adapted from [Brian Grant's Helm Summit talk](https://www.youtube.com/watch?v=F-TlC8nIz8s) (slides [here](https://docs.google.com/presentation/d/10dp4hKciccincnH6pAFf7t31s82iNvtt_mwhlUbeCDw/edit#slide=id.g32690131a8_0_5)): package management, dependency management, application metadata, parameterization, templating, deployment/config revision management, lifecycle management hooks, and application probes. Along with these fundamental features, an expanding number of [command plugins](https://helm.sh/docs/community/related/#helm-plugins) for more specific use-cases have started to become popular in the Helm ecosystem. If we can build a better workflow for both application developers and application operators by improving the user experience for most of these Helm features, we can generalize and expand this workflow to support alternative tooling that exists in the [Kubernetes application management ecosystem](https://docs.google.com/spreadsheets/d/1FCgqz1Ci7_VCz_wdh8vBitZ3giBtac_H8SBw4uxnrsE/edit#gid=0). 