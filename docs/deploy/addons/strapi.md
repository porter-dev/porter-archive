# Deploy Strapi with Porter
This is a quickstart repository you can fork to deploy Strapi to Kubernetes on AWS/GCP/DO with Porter. This sample repository uses PostgresDB by default. Modify the files in `/app/config/env/production` to customize your database settings.

# Quick Deploy
## Deploying Strapi
1. Create an account on [Porter](https://dashboard.getporter.dev).
2. [One-click provision a Kubernetes cluster](https://docs.getporter.dev/docs/getting-started-with-porter-on-aws) in a cloud provider of your choice, or [connect an existing cluster.](https://docs.getporter.dev/docs/cli-documentation#connecting-to-an-existing-cluster)
3. Fork [this repository](https://github.com/porter-dev/strapi).
4. From the [Launch tab](https://dashboard.getporter.dev/launch), navigate to **Web Service > Deploy from Git Repository**. Then select the forked repository and `Dockerfile` in the root directory.
5. Configure the port to `1337`, add environment variable `NODE_ENV=production`, and set resources to the [recommended settings](https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/deployment.html#general-guidelines) (i.e. 2048Mi RAM, 1000 CPU).
6. Hit Deploy!

## Deploying PostgresDB
1. Strapi instance deployed through Porter connects to PostgresDB. You can connect Strapi instance deployed on Porter to any external database, but it is also possible to use a database that is also deployed on Porter. Follow [this guide to deploy a PostgresDB instance to your cluster in one click](https://docs.getporter.dev/docs/postgresdb).
2. After the database has been deployed, navigate to the **Environment Variables** tab of your deployed Strapi instance. Configure the following environment variables:
```
NODE_ENV=production
DATABASE_HOST=
DATABASE_PORT=5432
DATABASE_NAME=
DATABASE_USERNAME=
DATABASE_PASSWORD=
```
For details on how to connect to the deployed database, [see this guide](https://docs.getporter.dev/docs/postgresdb#connecting-to-the-database).

# Development
To develop, clone this repository to your local environment and run `npm install && npm run develop;` from the `app` directory. Porter will automatically handle CI/CD and propagate your changes to production on every push to the repository.

# Questions?
Join the [Porter Discord community](https://discord.gg/FaaFjb6DXA) if you have any questions or need help.
