# Deployment
To deploy a PostgresDB instance on Porter, head to the **Community Add-ons** tab. Specify a username and password you'd like for the instance. You can optionally configure the amount of resources (i.e. CPU and RAM) assigned to the database instance.

PostgresDB instances deployed on Porter have persistent volumes attached to them to prevent data loss in the case of accidents. See [Persistent Volumes](#persistent-volumes) for a guide on how to manage these volumes in your cloud provider.

![Postgres](https://files.readme.io/2ddb8a2-Screen_Shot_2021-03-18_at_2.48.50_PM.png "Screen Shot 2021-03-18 at 2.48.50 PM.png")

# Connecting to the Database

PostgresDB on Porter is by default only exposed to internal traffic - only applications and add-on's that are deployed in the same Kubernetes cluster can connect to the database. The DNS name for the instance can be found on the deployment view as shown below. Note that Postgres listens on port 5432 by default.

![Internal URI](https://files.readme.io/857e0ed-Screen_Shot_2021-03-18_at_2.58.57_PM.png "Screen Shot 2021-03-18 at 2.58.57 PM.png")

Note that the connection URI for the PostgresDB instance follows this format: 

```
postgres://${USERNAME}:${PASSWORD}@${DNS_NAME}:5432/${DATABASE_NAME}
```

For the example above, the connection string would be:

```
postgres://postgres@force-double-snake-postgresql.default.svc.cluster.local:5432/postgres
```

# Deletion
To delete this add-on, navigate to the **Settings** tab of the deployment. Note that deleting from the Porter dashboard will not delete the persistent volumes that have been attached to your PostgresDB instance. To delete these dangling volumes, see the next section.

# Persistent Volumes

## AWS
By default, Porter creates [EBS volumes](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volumes.html) of type **gp2** (general purpose SSD) volumes that are attached to the database. To view the volumes attached to your cluster, navigate to **EC2 > Volumes** tab in your AWS console.

> ❗️
> 
> The unnamed 100GB volumes are attached to your EKS cluster itself. Make sure to not delete them - this will make your cluster not functional.

![AWS Volumes](https://files.readme.io/c9b77c7-Screen_Shot_2021-03-18_at_3.11.11_PM.png "Screen Shot 2021-03-18 at 3.11.11 PM.png")

Click on the volume and navigate to the **Tags** tab to see which deployment the volume belongs to. You can modify, delete, and make a snapshot of this volume from the AWS console.

![AWS DB Volume](https://files.readme.io/d2b93d2-Screen_Shot_2021-03-18_at_3.17.19_PM.png "Screen Shot 2021-03-18 at 3.17.19 PM.png")