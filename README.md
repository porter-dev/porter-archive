# Omni

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs) [![Go Report Card](https://goreportcard.com/badge/gojp/goreportcard)](https://goreportcard.com/report/github.com/omnirpa/Omni) [![Discord](https://img.shields.io/discord/542888846271184896?color=7389D8&label=community&logo=discord&logoColor=ffffff)](https://discord.gg/mmGAw5nNjr)
[![Twitter](https://img.shields.io/twitter/url/https/twitter.com/cloudposse.svg?style=social&label=Follow)](https://twitter.com/getOmnidev)

**Omni is a cloud and edge specific autonomous workflow platfrom.** Omni brings the multi cloud experience to your own application, while upgrading your infrastructure to Kubernetes. Get started on Omni without the overhead of DevOps and customize your infrastructure later when you need to.

![Provisioning View](https://user-images.githubusercontent.com/22849518/104234811-fe2dcb00-5421-11eb-9ce3-c0ebefc37476.png)

## Community and Updates

For help, questions, or if you just want a place to hang out, [join our Discord community.](https://discord.gg/mmGAw5nNjr)

To keep updated on our progress, please watch the repo for new releases (**Watch > Custom > Releases**) and [follow us on Twitter](https://twitter.com/getOmnidev)!

## Why Omni?

### A workflow platform that grows with your applications

Omni brings the automation that is much needed to stich things together.

![image](https://user-images.githubusercontent.com/65516095/103713478-71e75800-4f8a-11eb-915f-adee9d4f5bf7.png)

## Features

### Basics

- One-click provisioning of a cloud services cluster in your own cloud console
  - ✅ AWS
  - ✅ GCP
  - ✅ AZure

- Simple deploy of any public or private Docker image
- Auto CI/CD with [buildpacks](https://buildpacks.io) for non-Dockerized apps
- GUI to monitor application status, logs, and history
- Application rollback to previously deployed versions
- Zero-downtime deploy and health checks
- Monitor CPU, RAM, and Network usage per deployment
- Marketplace for one click add-ons (e.g. MongoDB, Redis, PostgreSQL)

### DevOps Mode

For those who are familiar with Kubernetes and Helm:

- Connect to existing Kubernetes clusters that are not provisioned by Omni
- Visualize, deploy, and configure Helm charts via the GUI
- User-generated [form overlays](https://github.com/omnirpa/Omni-charts/blob/master/docs/form-yaml-reference.md) for managing `values.yaml`
- In-depth view of releases, including revision histories and component graphs
- Rollback/update of existing releases, including editing of raw `values.yaml`

![Graph View](https://user-images.githubusercontent.com/22849518/101073320-43322800-356d-11eb-9b69-a68bd951992e.png)

## Docs

Below are instructions for a quickstart. For full documentation, please visit our [official Docs.](https://docs.getOmni.dev)

## Getting Started

1. Sign up and log into [Omni Dashboard](https://console.omnirpa.io).

2. Create a Project and [put in your cloud provider credentials](https://console.omnirpa.io/docs/getting-started-with-Omni-on-aws). Omni will automatically provision a Kubernetes cluster in your own cloud. It is also possible to [link up an existing Kubernetes cluster.](https://docs.console.omnirpa.io/docs/cli-documentation#connecting-to-an-existing-cluster)

3. 🚀 Deploy your applications from a [git repository](https://console.omnirpa.io/docs/applications) or [Docker image registry](https://docs.getOmni.dev/docs/cli-documentation#Omni-docker-configure).

## Running Omni Locally

While it requires a few additional steps, it is possible to run Omni locally. Follow [this guide](https://console.omnirpa.io/docs/running-Omni-locally) to run the local version of Omni.

## Want to Help?

We welcome all contributions. If you're interested in contributing, please read our [contributing guide](https://github.com/omnirpa/omni/blob/master/CONTRIBUTING.md) and [join our Discord community](https://discord.gg).

![Omni](https://user-images.githubusercontent.com/65516095/103712859-def9ee00-4f88-11eb-804c-4b775d697ec4.jpeg)
