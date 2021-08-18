Porter lets you deploy a service directly from a Git repository. By default, services on Porter automatically update whenever there is a push to the primary branch (usually `main` or `master`) of the connected repo.

> 📘 Prerequisites
> 
> - A repository (public or private) hosted on GitHub
> - A Kubernetes cluster and container registry linked to Porter (linked by default if you provisioned through Porter). **Note:** If you didn't provision through Porter, consult the docs to link an existing cluster or registry. 
> - (Optional) A Dockerfile that generates the Docker image you would like to run on Porter

Let's get started!

1. On the Porter dashboard, navigate to the **Launch** tab in the sidebar and select **Web Service** -> **Launch Template**.

2. Select the **Git Repository** option. If you have not linked your GitHub account, click "log in with GitHub" to authorize Porter to access your repositories.

> 📘
> 
> Porter will set up CI/CD with [Github Actions](https://github.com/features/actions) to automatically build and deploy new versions of your code. You can learn more about how Porter uses Github Actions [here](https://docs.getporter.dev/docs/auto-deploy-requirements#cicd-with-github-actions).

![Select Repository](https://files.readme.io/0660e91-Screen_Shot_2021-03-17_at_7.20.44_PM.png "Screen Shot 2021-03-17 at 7.20.44 PM.png")

3. After returning to the **Launch** tab you will be prompted to select a repository and source folder. Select the root folder of your service (this is usually where you run a start command like `npm start` or `python -m flask run`) and click **Continue**. If you have an existing Dockerfile, you can select it directly instead of using a folder. 

> 📘
> 
> If you specify a folder in your repo to use as source, Porter will autodetect the language runtime and build your application using Cloud Native Buildpacks. For more details refer to our guide on [requirements for auto build](https://docs.getporter.dev/docs/auto-deploy-requirements).

4. Click **Continue** once your source has been connected. This will take you to the **GitHub Actions** page, where you can see a workflow that will be created in the selected repository for automatically deploying new changes as they are pushed.  
You can skip the creation of this workflow using the **Create workflow file** toggle, in case you wish to manually add the [`porter-update-action`](https://github.com/porter-dev/porter-update-action) to a different workflow of your choice.


![GitHub Actions page](https://user-images.githubusercontent.com/44864521/129893348-44d63d54-115b-436b-bc41-48c6d8c94dc2.png)

5. Under **Additional Settings**, you can configure remaining options like your service's port and computing resources. Once you're ready, click the **Deploy** button to launch. You will be redirected to the cluster dashboard where you should see your newly deployed service.

![Deployed service](https://files.readme.io/4f731ca-Screen_Shot_2021-03-17_at_7.53.40_PM.png "Screen Shot 2021-03-17 at 7.53.40 PM.png")

5. The first time your service is being built, your deployment will use a placeholder Docker image until the GitHub Action has completed. You can monitor the status of the generated GitHub Action by checking the **Actions** tab in your linked repository.

![Actions tab on GitHub repository](https://files.readme.io/ffe7b14-d1046ba-Screen_Shot_2021-02-26_at_11.33.55_AM.png "Screen_Shot_2021-02-26_at_11.33.55_AM.png")

After the GitHub Action has finished running, you can refresh the Porter dashboard. The new version of your service should have been successfully deployed.
