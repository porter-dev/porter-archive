# Porter 
[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs) [![Go Report Card](https://goreportcard.com/badge/gojp/goreportcard)](https://goreportcard.com/report/github.com/porter-dev/porter) [![Discord](https://img.shields.io/discord/542888846271184896?color=7389D8&label=community&logo=discord&logoColor=ffffff)](https://discord.gg/MhYNuWwqum)


**Porter is a Kubernetes-powered PaaS that runs in your own cloud provider.** Porter brings the Heroku experience to Kubernetes without compromising its flexibility. Get started on Porter without the overhead of DevOps and fully customize your infra later when you need to.

![Provisioning View](https://user-images.githubusercontent.com/22849518/104234811-fe2dcb00-5421-11eb-9ce3-c0ebefc37476.png)

## Community and Updates

For help, questions, or if you just want a place to hang out, [join our Discord community.](https://discord.gg/MhYNuWwqum)

To keep updated on our progress, please watch the repo for new releases (**Watch > Custom > Releases**) and [follow us on Twitter!](https://twitter.com/getporterdev)

## Why Porter?
### A PaaS that grows with your applications

A traditional PaaS like Heroku is great for minimizing unnecessary DevOps work but doesn't offer enough flexibility as your applications grow. Custom network rules, resource constraints, and cost are common reasons developers move their applications off Heroku beyond a certain scale. 

Porter brings the simplicity of a traditional PaaS to your own cloud provider while preserving the configurability of Kubernetes. Porter is built on top of a popular Kubernetes package manager `helm` and is compatible with standard Kubernetes management tools like `kubectl`, preparing your infra for mature DevOps work from day one.

![image](https://user-images.githubusercontent.com/65516095/103713478-71e75800-4f8a-11eb-915f-adee9d4f5bf7.png)

## Features
### Basics
- One-click provisioning of a Kubernetes cluster in your own cloud console
  - ✅   AWS
  - ✅   GCP
  - ✅   Digital Ocean
- Simple deploy of any public or private Docker image
- Heroku-like GUI to monitor application status, logs, and history
- Marketplace for one click add-ons (e.g. MongoDB, Redis, PostgreSQL)
- Application rollback to previously deployed versions
- Deploy webhooks that can be triggered from CI/CD pipelines
- Native CI/CD with buildpacks for non-Dockerized apps (Coming Soon)

### DevOps Mode
For those who are familiar with Kubernetes and Helm:

- Connect to existing Kubernetes clusters that are not provisioned by Porter
- Visualize, deploy, and configure Helm charts via the GUI
- User-generated [form overlays](https://docs.getporter.dev/docs/porter-templates) for managing `values.yaml`
- In-depth view of releases, including revision histories and component graphs
- Rollback/update of existing releases, including editing of raw `values.yaml`

![Graph View](https://user-images.githubusercontent.com/22849518/101073320-43322800-356d-11eb-9b69-a68bd951992e.png)

## Docs

Below are instructions for a quickstart. For full documentation, visit our [official Docs page.](https://docs.getporter.dev)

## CLI Installation
### Mac 
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

For Linux and Windows installation, see our [Docs](https://docs.getporter.dev/docs/cli-documentation#linux). 

## Getting Started
1. Sign up and log into [Porter Dashboard](https://dashboard.getporter.dev).

2. Create a Project and select a cloud provider you want to provision a Kubernetes cluster in (AWS, GCP, DO). It is also possible to [link up your own Kubernetes cluster.](https://docs.getporter.dev/docs/cli-documentation#linking-your-own-private-image-registry)

3. [Put in your credentials](https://docs.getporter.dev/docs/getting-started-with-porter-on-aws), then Porter will automatically provision a cluster and an image registry in your own cloud account.

4. [Build and push your Docker image](https://docs.getporter.dev/docs/cli-documentation#porter-docker-configure), or connect your git repository if your application is not dockerized.

5. From the Templates tab on the Dashboard, select the Docker template. Click on the image you have just pushed, configure the port, then hit deploy.

## Want to Help?
We welcome all contributions. Submit an issue or a pull request to help us improve Porter!
![porter](https://user-images.githubusercontent.com/65516095/103712859-def9ee00-4f88-11eb-804c-4b775d697ec4.jpeg)
