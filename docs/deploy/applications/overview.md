There are three types of applications you can deploy on Porter: web services, workers, and cron jobs. Below is an overview of each application type as well as the use cases each one is best suited for.

# Web Service

Web services are processes that are constantly running and are exposed to either external or internal traffic. This includes any servers or web applications - most of your deployments should fall into this category.

You can choose to expose your application to external traffic on a custom domain - Porter will automatically [secure your endpoints with SSL certificates](https://dash.readme.com/project/porter-dev/v1.0/docs/https-and-custom-domains). Alternatively, you can expose your web service to only internal traffic (i.e. accessible only by other deployments in the same cluster). 

# Worker

Worker processes are constantly running processes that are exposed to neither external nor internal traffic. Workers have no URLs or ports - it's best suited for background processes, queuing systems, etc.

# Cron Job

Jobs are one-off processes that run to completion. It's best suited for ephemeral tasks such as database migration or clean up scripts.

Cron jobs run periodically on a schedule specified as a cron expression. Please see [this article](https://en.wikipedia.org/wiki/Cron#Overview) for a quick guide on cron expressions. To create cron expressions more easily, try [this online editor](https://crontab.guru/) to generate cron schedule expressions.