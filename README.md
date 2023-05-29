# Porter

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![Go Report Card](https://goreportcard.com/badge/gojp/goreportcard)](https://goreportcard.com/report/github.com/porter-dev/porter) [![Discord](https://img.shields.io/discord/542888846271184896?color=7389D8&label=community&logo=discord&logoColor=ffffff)](https://discord.gg/mmGAw5nNjr)
[![Twitter](https://img.shields.io/twitter/url/https/twitter.com/cloudposse.svg?style=social&label=Follow)](https://twitter.com/porterdotrun)

**Porter is a Kubernetes-powered PaaS that runs in your own cloud provider.** Porter brings the Heroku experience to your own AWS/GCP account, while upgrading your infrastructure to Kubernetes. Get started on Porter without the overhead of DevOps and customize your infrastructure later when you need to.

<img width="1440" alt="image" src="https://user-images.githubusercontent.com/93286801/227250589-1ebe0f79-c352-4eb4-adfd-7cb10957be3d.png">

## Community and Updates

For help, questions, or if you just want a place to hang out, [join our Discord community.](https://discord.gg/mmGAw5nNjr)

To keep updated on our progress, please watch the repo for new releases (**Watch > Custom > Releases**) and [follow us on Twitter](https://twitter.com/getporterdev)!

## Why Porter?

### A PaaS that grows with your applications

A traditional PaaS like Heroku is great for minimizing unnecessary DevOps work but doesn't offer enough flexibility as your applications grow. Custom network rules, resource constraints, and cost are common reasons developers move their applications off Heroku beyond a certain scale.

Porter brings the simplicity of a traditional PaaS to your own cloud provider while preserving the configurability of Kubernetes. Porter is built on top of a popular Kubernetes package manager `helm` and is compatible with standard Kubernetes management tools like `kubectl`, preparing your infra for mature DevOps work from day one.

<img width="1440" alt="image" src="https://user-images.githubusercontent.com/93286801/227251932-13caf45f-6082-4d6d-85f5-812698e09dae.png">

## Features

### Basics

- One-click provisioning of a Kubernetes cluster in your own cloud console
  - ✅ AWS
  - ✅ GCP
- Simple deploy of any public or private Docker image
- Auto CI/CD with [buildpacks](https://buildpacks.io) for non-Dockerized apps
- Heroku-like GUI to monitor application status, logs, and history
- Application rollback to previously deployed versions
- Zero-downtime deploy and health checks
- Monitor CPU, RAM, and Network usage per deployment
- Marketplace for one click add-ons (e.g. MongoDB, Redis, PostgreSQL)

### DevOps Mode

For those who are familiar with Kubernetes and Helm:

- Connect to existing Kubernetes clusters that are not provisioned by Porter
- Visualize, deploy, and configure Helm charts via the GUI
- User-generated [form overlays](https://github.com/porter-dev/porter-charts/blob/master/docs/form-yaml-reference.md) for managing `values.yaml`
- In-depth view of releases, including revision histories and component graphs
- Rollback/update of existing releases, including editing of raw `values.yaml`

<img width="1426" alt="image" src="https://user-images.githubusercontent.com/93286801/227253754-8e8921e9-4609-4e92-9e3d-6732fb9cfe1c.png">

## Docs

Below are instructions for a quickstart. For full documentation, please visit our [official Docs.](https://docs.getporter.dev)

## Getting Started

1. Sign up and log into [Porter Dashboard](https://dashboard.getporter.dev).

2. Create a Project and [put in your cloud provider credentials](https://docs.getporter.dev/docs/getting-started-with-porter-on-aws). Porter will automatically provision a Kubernetes cluster in your own cloud. It is also possible to [link up an existing Kubernetes cluster.](https://docs.getporter.dev/docs/cli-documentation#connecting-to-an-existing-cluster)

3. 🚀 Deploy your applications from a [git repository](https://docs.getporter.dev/docs/applications) or [Docker image registry](https://docs.getporter.dev/docs/cli-documentation#porter-docker-configure).

## Want to Help?

We welcome all contributions. If you're interested in contributing, please read our [contributing guide](https://github.com/porter-dev/porter/blob/master/CONTRIBUTING.md) and [join our Discord community](https://discord.gg/GJynMR3KXK).
