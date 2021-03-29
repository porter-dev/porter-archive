# Porter

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs) [![Go Report Card](https://goreportcard.com/badge/gojp/goreportcard)](https://goreportcard.com/report/github.com/porter-dev/porter) [![Discord](https://img.shields.io/discord/542888846271184896?color=7389D8&label=community&logo=discord&logoColor=ffffff)](https://discord.gg/34n7NN7FJ7)
[![Twitter](https://img.shields.io/twitter/url/https/twitter.com/cloudposse.svg?style=social&label=Follow)](https://twitter.com/getporterdev)

**Porter is a Kubernetes-powered PaaS that runs in your own cloud provider.** Porter brings the Heroku experience to Kubernetes without compromising its flexibility. Get started on Porter without the overhead of DevOps and fully customize your infra later when you need to.

![Provisioning View](https://user-images.githubusercontent.com/22849518/104234811-fe2dcb00-5421-11eb-9ce3-c0ebefc37476.png)

## Community and Updates

For help, questions, or if you just want a place to hang out, [join our Discord community.](https://discord.gg/34n7NN7FJ7)

To keep updated on our progress, please watch the repo for new releases (**Watch > Custom > Releases**) and [follow us on Twitter](https://twitter.com/getporterdev)!

## Why Porter?

### A PaaS that grows with your applications

A traditional PaaS like Heroku is great for minimizing unnecessary DevOps work but doesn't offer enough flexibility as your applications grow. Custom network rules, resource constraints, and cost are common reasons developers move their applications off Heroku beyond a certain scale.

Porter brings the simplicity of a traditional PaaS to your own cloud provider while preserving the configurability of Kubernetes. Porter is built on top of a popular Kubernetes package manager `helm` and is compatible with standard Kubernetes management tools like `kubectl`, preparing your infra for mature DevOps work from day one.

![image](https://user-images.githubusercontent.com/65516095/103713478-71e75800-4f8a-11eb-915f-adee9d4f5bf7.png)

## Features

### Basics

- One-click provisioning of a Kubernetes cluster in your own cloud console
  - ✅ AWS
  - ✅ GCP
  - ✅ Digital Ocean
- Simple deploy of any public or private Docker image
- Auto CI/CD with [buildpacks](https://buildpacks.io) for non-Dockerized apps
- Heroku-like GUI to monitor application status, logs, and history
- Application rollback to previously deployed versions
- Zero-downtime deploy and health checks
- Marketplace for one click add-ons (e.g. MongoDB, Redis, PostgreSQL)

### DevOps Mode

For those who are familiar with Kubernetes and Helm:

- Connect to existing Kubernetes clusters that are not provisioned by Porter
- Visualize, deploy, and configure Helm charts via the GUI
- User-generated [form overlays](https://docs.getporter.dev/docs/porter-templates) for managing `values.yaml`
- In-depth view of releases, including revision histories and component graphs
- Rollback/update of existing releases, including editing of raw `values.yaml`

![Graph View](https://user-images.githubusercontent.com/22849518/101073320-43322800-356d-11eb-9b69-a68bd951992e.png)

## Docs

Below are instructions for a quickstart. For full documentation, please visit our [official Docs.](https://docs.getporter.dev)

## Getting Started

1. Sign up and log into [Porter Dashboard](https://dashboard.getporter.dev).

2. Create a Project and [put in your cloud provider credentials](https://docs.getporter.dev/docs/getting-started-with-porter-on-aws). Porter will automatically provision a Kubernetes cluster in your own cloud. It is also possible to [link up an existing Kubernetes cluster.](https://docs.getporter.dev/docs/cli-documentation#connecting-to-an-existing-cluster)

3. Deploy your applications from a [git repository](https://docs.getporter.dev/docs/applications) or [Docker image registry](https://docs.getporter.dev/docs/cli-documentation#porter-docker-configure).

## Want to Help?

We welcome all contributions. Submit an issue or a pull request to help us improve Porter! If you're interested in contributing, please [join our Discord community](https://discord.gg/34n7NN7FJ7) for more info.

![porter](https://user-images.githubusercontent.com/65516095/103712859-def9ee00-4f88-11eb-804c-4b775d697ec4.jpeg)
