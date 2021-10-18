# Introduction

An **environment group** is a set of environment variables that are meant to be reused across multiple applications. For example, if all web services require a shared set of API and database keys, this could form a `web-service` environment group with all of those keys as a shared configuration. In this guide, we will explain how to create and use environment groups. 

> 📘
> 
> Environment groups are stored in **your own cluster** as a Kubernetes [Config Map](https://kubernetes.io/docs/concepts/configuration/configmap/) or a Kubernetes [Secret](https://kubernetes.io/docs/concepts/configuration/secret). The data will be visible to any users or services with access to your cluster, such as Porter.

# Creating and using environment groups

You can create a new environment group in the "Env Groups" tab on the dashboard. Click on "Create Env Group" from this tab:

![Create env group](https://files.readme.io/07c9628-env-groups-0.png "env-groups-0.png")

From this screen, you can name your env group and add your environment variables. In this example, we will simply create an environment group named `web` that will be shared across all web services that we create. When you're finished, press "Create env group". 

![Create env group finished](https://files.readme.io/f795459-env-groups-1.png "env-groups-1.png")

You will be redirected to the list of environment groups, and your new environment group should be listed. At this point, you can use this environment group in a deployment. From the "Launch" tab, you can select "Load from Env Group" in the "Environment" tab:

![Load env group](https://files.readme.io/c909d6a-env-groups-4.png "env-groups-4.png")

You can then select your environment group and click "Load Selected Env Group", which will automatically populate the environment group variables that you previously set. You can modify these environment variables in this tab, for example if you'd like to add environment variables that aren't currently in the environment group. To view all deployment options, head over to our [application deployment docs](https://docs.porter.run/docs/addons). 

# 🔒 Creating secret environment variables

Porter supports creating secret environment variables that will not be exposed after creation. At the moment, you must create an environment group in order to create secret environment variables. To create a secret environment variable, click on the lock icon next to the environment variable during creation of the environment variable:

![Lock icon](https://files.readme.io/1d91810-env-groups-5.png "env-groups-5.png")

When you launch a new service, and you select "Load from Env Group" in the "Environment" tab, this sensitive value will be injected into the container before it is mounted:

![Sensitive value](https://files.readme.io/14f07f3-Screen_Shot_2021-04-27_at_9.33.04_AM.png "Screen Shot 2021-04-27 at 9.33.04 AM.png")

> 📘
> 
> **Note:** the sensitive value above is not written to the dashboard -- the hidden value is simply a dummy string.

# Updating and deleting environment groups

To update or delete your environment group, navigate back to the "Env Groups" tab, and click on the existing environment group to update or delete. You can make changes to the env group here, and select the "Update" button when finished: 

![Updating env group](https://files.readme.io/d26712e-env-groups-2.png "env-groups-2.png")

To delete the environment group, navigate to the "Settings" tab, and press the "Delete" button:

![Deleting env group](https://files.readme.io/4323089-env-groups-3.png "env-groups-3.png")

# How Secrets are Stored

All env group variables are stored **in your own cluster**, and not on Porter's infrastructure. The entire env group is stored as a Kubernetes [Config Map](https://kubernetes.io/docs/concepts/configuration/configmap/), which is meant for non-sensitive, unstructured data. When you create a secret environment variable, the ConfigMap will contain a reference to a Kubernetes [Secret](https://kubernetes.io/docs/concepts/configuration/secret), which contains the secret data. This secret will be [injected into your container](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/) as it is mounted, and will not be exposed on the Porter dashboard after creation. To summarize:

- No env group data is stored on Porter's servers: it is all stored on your own cluster. 
- **Non-sensitive data** in an env group will be read into memory on Porter's servers during deployment, and added directly to the deployment. 
- **Sensitive data** in an env group will **not** be read into memory on Porter's servers during deployment, and are referenced as a secret during deployment. This sensitive data only exists in memory on Porter's infrastructure during creation/updating of the env group (**not** the deployment). 

## Encryption

We don't do any special encryption beyond what is offered by the managed Kubernetes providers. Some providers will encrypt all secret data in the control plane at rest (in `etcd`), others will store it as base64-encoded data. While you don't have access to this control plane or the `etcd` instance, users with access to your cluster could view the secrets using `kubectl get secrets -o yaml`, for example.

> 📘
> 
> **Note:** for secret encryption beyond what is offered in the managed Kubernetes providers, you may want to use a solution such as [sealed-secrets](https://github.com/bitnami-labs/sealed-secrets).
