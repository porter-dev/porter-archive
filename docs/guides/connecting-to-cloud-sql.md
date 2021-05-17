Porter supports connecting to a Google Cloud SQL database using the [Cloud SQL Auth proxy](https://cloud.google.com/sql/docs/mysql/sql-proxy). This connection method provides Google Cloud users strong encryption and IAM-based authentication when accessing a MySQL, PostgreSQL, or SQL Server instance hosted on Cloud SQL.

If you don't already have a Cloud SQL instance, please refer to the official docs for [creating a Cloud SQL instance](https://cloud.google.com/sql/docs/mysql/create-instance). 

> 📘
>
> This guide will demonstrate how to securely connect to a PostgreSQL instance hosted on Cloud SQL. That said, the steps for connecting to MySQL or a generic SQL Server on Cloud SQL are virtually identical.

1. First, navigate to the **Launch** tab from the Porter dashboard and choose to create either a **Web Service** or **Worker** (depending on whether you would like to expose your service to external traffic).

2. After naming your service and configuring any desired application settings, navigate to the **Advanced** tab under **Additional Settings** and select **Enable Google Cloud SQL Proxy**:

![Cloud SQL proxy](https://files.readme.io/5e3c9b7-Screen_Shot_2021-04-19_at_10.23.18_PM.png "Screen Shot 2021-04-19 at 10.23.18 PM.png")

3. You will be prompted for an **Instance Connection Name**, **Database Port**, and **Service Account JSON**. First, go to your [Cloud SQL dashboard](https://console.cloud.google.com/sql/instances) and copy your database's **Instance Connection Name** into Porter:

![Instance connection name](https://files.readme.io/ca9a00f-Screen_Shot_2021-04-19_at_10.38.36_PM.png "Screen Shot 2021-04-19 at 10.38.36 PM.png")

4. Next, on the Porter dashboard specify the port for your database. Defaults are: Postgres: 5432, MySQL: 3306, SQLServer: 1433.

5. Finally, copy the raw JSON of your Cloud SQL Service Account into the **Service Account JSON** field. If you don't already have a Cloud SQL Service Account, you should [create a Service Account with Cloud SQL access permissions](https://cloud.google.com/sql/docs/mysql/connect-admin-proxy#create-service-account):

![Service Account JSON](https://files.readme.io/b22baf5-Screen_Shot_2021-04-19_at_10.41.48_PM.png "Screen Shot 2021-04-19 at 10.41.48 PM.png")

6. After deploying your template, your service should be able to connect to your Cloud SQL database via `localhost`.

If you would like to learn more about connecting to Cloud SQL via Auth proxy, please refer to refer to the [official Google Cloud guide](https://cloud.google.com/sql/docs/mysql/connect-kubernetes-engine) for additional information.