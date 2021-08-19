Porter lets you deploy a service from a public or private Docker image registry. You can update your service after it has been deployed by triggering a generated webhook or by manually redeploying with a specific image tag.

> 📘 Prerequisites
>
> - A public Docker image or private container registry linked to Porter. See how to [link a registry to Porter]((https://docs.getporter.dev/docs/linking-an-existing-docker-container-registry))
> - A Kubernetes cluster connected to Porter (linked by default if you provisioned through Porter). 
>
> **Note:** If you didn't provision through Porter, you can still [link an existing cluster](). 

Let's get started!

1. On the Porter dashboard, navigate to the **Launch** tab in the sidebar and select **Web Service** -> **Launch Template**.

2. Select the **Docker Registry** option. If you have not linked a registry, you can do so from the **Integrations** tab ([learn more](https://docs.getporter.dev/docs/linking-an-existing-docker-container-registry)). 

3. Indicate the image repo and image tag you would like to use.

![Image repo selection](https://files.readme.io/9d796f4-Screen_Shot_2021-03-18_at_11.26.45_AM.png "Screen Shot 2021-03-18 at 11.26.45 AM.png")

4. Select "Continue" after specifying your image. Under **Additional Settings**, you can configure remaining options like your service's port and computing resources. Once you're ready, click the **Deploy** button to launch. You will be redirected to the cluster dashboard where you should see your newly deployed service.

5. To programmatically redeploy your service (for instance, from a CI pipeline), you will need to call your service's custom webhook. You can find your webhook by expanding your deployed service and going to the **Settings** tab.

![Webhook](https://user-images.githubusercontent.com/11699655/120046959-ac25c480-c013-11eb-8b2f-e6bfd704d7fc.png "webhook in the settings tab")

Make sure to replace the `YOUR_COMMIT_HASH` field with the tag of your Docker image.
