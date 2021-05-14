Porter supports linking a private Docker container registry to your project. This container registry is used to deploy Docker containers onto a cluster and push new versions of the image to your registry from CI/CD workflows. We support the following container registries:

- Amazon Elastic Container Registry (ECR) 
- Google Container Registry (GCR)
- DigitalOcean Container Registry 
- Docker Hub 
- Other registries which implement the [Registry HTTP API v2](https://docs.docker.com/registry/spec/api/) 

The following guide will show you how to link your container registries depending on your registry provider. Linking your container registries requires the Porter CLI to be installed, so make sure that you've following the [installation guide for the CLI](cli-documentation#installation). 

## Amazon Elastic Container Registry (ECR)

Run the following command on the Porter CLI:

```sh
porter connect ecr
```

You will be prompted for the region your ECR instance belongs to. For example:

```sh
Please provide the AWS region where the ECR instance is located.
AWS Region: us-east-2
```

The CLI will then ask if you'd like to set up an IAM user in your AWS account automatically, or if you'd like to enter your credentials manually. If you specify yes, Porter will create a user with the policy `AmazonEC2ContainerRegistryFullAccess` that can push/pull images from ECR. If you'd like more fine-grained access control, specify no and create an IAM user with custom permissions, and generate an access key/secret for this user and input this information into the CLI. 

Finally, the CLI will prompt you to enter a name for the registry. Here you may enter any name you like.

```sh
Give this registry a name: my-awesome-registry
```

That's it! If you navigate to the "Launch" tab in the dashboard, you should see your existing ECR images in the "Registry" section. 

## Google Container Registry (GCR)

In order to connect to an existing GCR instance, you must create a service account with permission to push/pull from GCR. 

1. First, go to your [Google Cloud console](https://console.cloud.google.com/) and navigate to **IAM & Admin** -> **Service Accounts**:

![GCP service accounts](https://files.readme.io/c93b89a-Screen_Shot_2021-02-26_at_8.34.21_AM.png "Screen Shot 2021-02-26 at 8.34.21 AM.png")

2. Select **Create Service Account**:

![Create SA](https://files.readme.io/8480097-Screen_Shot_2021-02-26_at_8.36.48_AM.png "Screen Shot 2021-02-26 at 8.36.48 AM.png")

3. Name your service account (for example, "porter-gcr-access"), grant the service account **Storage Admin** permissions, then select **Done**:

![Storage admin permissions](https://files.readme.io/3357638-Screen_Shot_2021-02-26_at_8.39.58_AM.png "Screen Shot 2021-02-26 at 8.39.58 AM.png")

4. After creating the service account, you will be redirected to the list of service accounts. Find the row with the newly created service account, and select "Manage keys" in the "Actions" column:

![Manage keys SA](https://files.readme.io/55283c8-Screen_Shot_2021-02-26_at_8.44.08_AM.png "Screen Shot 2021-02-26 at 8.44.08 AM.png")

5. Finally, press the "Add key" dropdown and select "Create new key". After choosing the **JSON** key type, your key file will be **automatically** downloaded:

![JSON key download](https://files.readme.io/21c8ec4-Screen_Shot_2021-02-26_at_8.45.48_AM.png "Screen Shot 2021-02-26 at 8.45.48 AM.png")

Now that you have downloaded this key, run the following command on the Porter CLI:

```sh
porter connect gcr
```

You will be prompted for the full path to the service account key file that you just downloaded. **Enter the full path (not relative) to the key file location**:

```sh
Key file location: [PATH]
```

Finally, you will be prompted to provide the registry URL, in the form `[GCR_DOMAIN]/[GCP_PROJECT_ID]`, and a name for the registry. For most, the GCR domain will be `gcr.io` (for more information, [click here](https://cloud.google.com/container-registry/docs/overview#registries)). 

```sh
Please provide the registry URL, in the form [GCP_DOMAIN]/[GCP_PROJECT_ID]. For example, gcr.io/my-project-123456.
Registry URL:
Give this registry a name:
```

That's it! If you navigate to the "Launch" tab in the dashboard, you should see your existing GCR images in the "Registry" section. 

## DigitalOcean Container Registry

Run the following command on the Porter CLI:

```sh
porter connect docr
```

If you have not yet linked a DigitalOcean account, this command will open the browser that allows you to link your DigitalOcean account. Authorize the DigitalOcean account that you'd like to give access. You will then be redirected to the dashboard, at which point you can close out of the browser tab and go back to the CLI. 

The CLI will then prompt you to provide a link to the container registry, in the form `registry.digitalocean.com/[REGISTRY_NAME]`. This can be found by navigating to the "Container Registry" tab in DigitalOcean and copying the registry name:

![Container registry name](https://files.readme.io/c5fc652-Screen_Shot_2021-02-26_at_9.00.08_AM.png "Screen Shot 2021-02-26 at 9.00.08 AM.png")

```sh
Please provide the registry URL, in the form registry.digitalocean.com/[REGISTRY_NAME]. For example, registry.digitalocean.com/porter-test. 
Registry URL: registry.digitalocean.com/porter-hi
```

That's it! If you navigate to the "Launch" tab in the dashboard, you should see your existing DigitalOcean Container Registry images in the "Registry" section. 

## Docker Hub

In order to connect to a Docker Hub image repository, you must first generate a personal access token in the Docker Hub dashboard. Navigate to the ["Security" tab in your account settings](https://hub.docker.com/settings/security), and select "New Access Token":

![Access token](https://files.readme.io/53cce0e-Screen_Shot_2021-02-26_at_9.09.26_AM.png "Screen Shot 2021-02-26 at 9.09.26 AM.png")

Name this access token something like "Porter," and copy the access token to the clipboard. 

> 📘
> 
> If you're planning on linking more than one image repository through Docker Hub, you will need to re-use this access token multiple times, so you may want to copy it to a local file on your computer and delete it when you're finished.

Then type `porter connect dockerhub` into the CLI. You will first be prompted to enter the path to the Docker Hub image repository that you would like to link. The image repository path can be found by going to the "Repositories" tab in Docker Hub and copying the username/organization and repository name. For example, for an organization called "porter1" and an image repository name called "porter", the repo name would be "porter1/porter":

```sh
Provide the Docker Hub image path, in the form of ${org_name}/${repo_name}. For example, porter1/porter.
Image path: porter1/porter
```

You should then enter your Docker Hub username and the access token you just copied. 

That's it! If you navigate to the "Launch" tab in the dashboard, you should see your existing Docker Hub image repository in the "Registry" section. 

> 📘 Linking Multiple Docker Hub Repositories
> 
> This flow only links a single Docker Hub repository at a time. If you'd like to link multiple repositories, you must run `porter connect dockerhub` for each repository.

## Custom/Private Registries

Other Docker container registries are supported, as long as they implement the  [Registry HTTP API v2](https://docs.docker.com/registry/spec/api/) specification. To link these, type `porter connect registry` into the CLI. You will then be asked to input the URL of your image repository:

```sh
Provide the image registry URL (include the protocol). For example, https://my-custom-registry.getporter.dev.
Image registry URL: https://my-custom-registry.getporter.dev
```

If your registry is public, you can simply press enter when asked to input the username/password. Otherwise, enter the username/password that you would use for `docker login`. 

That's it! If you navigate to the "Launch" tab in the dashboard, you should see your existing image repositories in the "Registry" section.