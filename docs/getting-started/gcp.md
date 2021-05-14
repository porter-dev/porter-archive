# Quick Installation
Porter runs on a Kubernetes cluster in your own Google Cloud account. You can provision a cluster through Porter by providing the credentials of a GCP service account.

> 🚧
> 
> Quick Installation uses **Owner** permissions to set up Porter. You can optionally specify the minimum IAM policies for provisioning both a cluster and registry.

<br />

# Prerequisites

To use Porter on GCP, you must first enable some APIs on your project.

1. Navigate to the **APIs & Services** tab of your project.

![APIs and services](https://files.readme.io/210337a-Screen_Shot_2021-05-06_at_6.23.07_PM.png "Screen Shot 2021-05-06 at 6.23.07 PM.png")

2. Click on the **Enable APIs and Services** button at the top. This will bring up a catalog of APIs that you can enable on GCP. Enable the following four APIs:
- Compute Engine API
- Kubernetes Engine API
- Cloud Resource Manager API
- Container Registry API

It might take a few minutes for each of these APIs to be enabled. Once you can confirm that all four APIs are enabled from the **APIs & Services** tab, proceed to the next section.

# Provisioning the Resources

1. First, go to your [Google Cloud console](https://console.cloud.google.com/) and navigate to **IAM & Admin** -> **Service Accounts**:

![Service accounts](https://files.readme.io/f0f2b69-Screen_Shot_2021-04-15_at_6.41.26_PM.png "Screen Shot 2021-04-15 at 6.41.26 PM.png")

<br />

2. Select **Create Service Account**:

![Create service account](https://files.readme.io/38dd34a-Screen_Shot_2021-04-15_at_6.45.42_PM.png "Screen Shot 2021-04-15 at 6.45.42 PM.png")

<br />

3. After naming your service account, grant the service account these four permissions: **Cloud Storage > Storage Admin**, **Compute Engine > Compute Admin**, **Kubernetes Engine > Kubernetes Engine Admin**, and **Service Accounts > Service Account User**. Select **Done** to create the service account.

![Create service account confirmation](https://files.readme.io/15b1d28-Screen_Shot_2021-01-28_at_4.34.21_PM.png "Screen Shot 2021-01-28 at 4.34.21 PM.png")

<br />

4. Once the service account has been created, under **Actions** select **Manage keys**.

![Manage keys](https://files.readme.io/b94a4ef-Screen_Shot_2021-04-15_at_6.51.25_PM.png "Screen Shot 2021-04-15 at 6.51.25 PM.png")

<br />

5. Select **ADD KEY** -> **Create new key** and then choose **JSON** as your key type. After creation, your JSON key will automatically be downloaded as a file.

![Download JSON](https://files.readme.io/ebeb5c2-Screen_Shot_2021-04-15_at_6.56.30_PM.png "Screen Shot 2021-04-15 at 6.56.30 PM.png")

<br />

6. Copy the contents of your JSON key file into Porter's GCP Credentials form along with your preferred GCP region and project ID:

> 📘
> 
> You can find your GCP project ID by navigating to [console.cloud.google.com](https://console.cloud.google.com). After being automatically redirected, your project ID will appear at the end of the URL as well as under **Project Info** on the dashboard.

![Project ID location](https://files.readme.io/8a89fea-Screen_Shot_2021-01-25_at_4.53.00_PM.png "Screen Shot 2021-01-25 at 4.53.00 PM.png")

After clicking **Submit** from Porter, installation will begin automatically.

# Deleting Provisioned Resources

> 🚧 GCP Deletion Instability
> 
> Deleting resources on GCP via Porter may result in dangling resources. After clicking delete, please make sure to check your GCP console to see if all resources have properly been removed. You can remove any dangling resources via either the GCP console or the gcloud CLI.

We recommend that you delete all provisioned resources through Porter as well as confirm resources have been deleted from the GCP console. This will ensure that you do not get charged on GCP for lingering resources.

To delete resources, click on **Cluster Settings** from the **Cluster Dashboard**.

![Cluster settings](https://files.readme.io/c1ed31a-Screen_Shot_2021-01-09_at_2.59.49_PM.png "Screen Shot 2021-01-09 at 2.59.49 PM.png")

Click **Delete Cluster** to remove the cluster from Porter and delete resources in your GCP console. It may take up to 30 minutes for these resources to be deleted from your GCP console. 

**Note that you can only delete cluster resources that have been provisioned via Porter from the dashboard.** 

![Cluster settings delete modal](https://files.readme.io/a7b36fc-Screen_Shot_2021-01-09_at_3.02.07_PM.png "Screen Shot 2021-01-09 at 3.02.07 PM.png")