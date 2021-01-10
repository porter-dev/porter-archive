# Porter 
[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs) [![Go Report Card](https://goreportcard.com/badge/gojp/goreportcard)](https://goreportcard.com/report/github.com/porter-dev/porter)

**Porter is a Kubernetes-powered PaaS that runs in your own cloud provider.** Porter brings the Heroku experience to Kubernetes without compromising its flexibility. Get started on Porter without the overhead of DevOps and fully customize your infra later when you need to.

![Provisioning View](https://user-images.githubusercontent.com/65516095/103712142-09e34280-4f87-11eb-9272-a35805544fd0.png)


## Why Porter?
### A PaaS that grows with your applications

Traditional PaaS's like Heroku are great at minimizing unnecessary DevOps work but don't offer enough flexibility as your applications scale. Custom network rules, resource constraints, and cost are common reasons developers move their application off Heroku beyond a certain scale. 

Porter brings the simplicity of traditional PaaS's to your own cloud provider while preserving the configurability of Kubernetes. It's built on top of a popular Kubernetes framework called Helm and is compatible with standard Kubernetes management tools like `kubectl`, preparing your infra for mature DevOps work from day 1.

![image](https://user-images.githubusercontent.com/65516095/103713478-71e75800-4f8a-11eb-915f-adee9d4f5bf7.png)

## Features
### Basics
- One-click provisioning of a Kubernetes cluster in your own cloud console
  - ✅ AWS
  - 🚧 GCP
  - 🚧 Digital Ocean
  
- Simple deploy of any public or private Docker image

- Heroku-like GUI to monitor application status, logs, and history
- Marketplace for 1-click add-on's (e.g. MongoDB, Redis, PostgreSQL)
- Application rollback to previous deploy versions
- Native CI/CD with buildpacks (Coming Soon)

### DevOps Mode
For those who are familiar with Kubernetes and Helm:

- Visualize, deploy and configure Helm charts via the GUI

- User-generated [form overlays](https://docs.getporter.dev/docs/porter-templates) for managing `values.yaml`
- In-depth view of releases, including revision histories and component graphs
- Rollback/update of existing releases, including editing of raw `values.yaml`
- Connect to existing Kubernetes clusters that are not provisioned by Porter

![Graph View](https://user-images.githubusercontent.com/22849518/101073320-43322800-356d-11eb-9b69-a68bd951992e.png)

## CLI Installation
### Mac 
Run the following command to grab the latest binary:

```sh
{
name=$(curl -s https://api.github.com/repos/porter-dev/porter/releases/latest | grep "browser_download_url.*porter_.*_Darwin_x86_64\.zip" | cut -d ":" -f 2,3 | tr -d \")
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

2. Create a Project and select a cloud provider you want to provision a Kubernetes cluster in.

3. [Put in your credentials](https://docs.getporter.dev/docs/getting-started-with-porter-on-aws), then Porter will automatically provision a cluster and an image registry in your own cloud account.

4. [Build and push your Docker image to the provisioned registry with the CLI](https://docs.getporter.dev/docs/cli-documentation#porter-docker-configure).

5. From the Templates tab on the Dashboard, select the Docker template. Click on the image you have just pushed, configure the port, then hit deploy.

## Want to Help?
We welcome all contributions. Submit an issue or a pull request to help us improve Porter!
![porter](https://user-images.githubusercontent.com/65516095/103712859-def9ee00-4f88-11eb-804c-4b775d697ec4.jpeg)
