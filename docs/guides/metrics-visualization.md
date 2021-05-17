Porter supports visualizing the resources (CPU/memory) that your applications are consuming over different time ranges. This is done by querying a Prometheus add-on deployed on your cluster.

# Deploying the Prometheus Addon


Navigate to **Launch > Community Add-ons > Prometheus** in order to install the Prometheus addon. No configuration settings are necessary to install this chart. 

![Install Prometheus](https://user-images.githubusercontent.com/25448214/118314719-81d7f100-b4c2-11eb-97cf-d11e5a535060.png "Screen Shot 2021-05-14 at 2 41 34 PM")

# Viewing Application Metrics

Navigate to the "Applications" tab for a cluster. After installing Prometheus, there will be a "Metrics" tab after you click on the application. Initially, these metrics will not show anything: after about an hour, it should start to display the application resource usage:

![Metrics View](https://user-images.githubusercontent.com/25448214/118315927-2575d100-b4c4-11eb-8f14-7175bfac3346.png "Screen Shot 2021-05-14 at 2 53 21 PM")

The default behavior is to display the summed resource usage of all currently running pods over the selected time range. You can view the resource usage of individual pods by clicking on the settings button:

![Metrics Pod Selection](https://user-images.githubusercontent.com/25448214/118315987-3cb4be80-b4c4-11eb-9dac-80866899c12a.png "Screen Shot 2021-05-14 at 2 53 56 PM")

# Viewing NGINX Metrics

Porter also supports viewing the error percentage of 500-level errors for your applications. Go to the `ingress-nginx` namespace and click on the `nginx-ingress` deployment. In the "Metrics" tab, there will be an additional metric called `5XX Error Percentage`:

![nginx-errors](https://user-images.githubusercontent.com/25448214/118315840-05dea880-b4c4-11eb-9671-a6b3a6119091.png "nginx-errors")

## For Clusters Created Before April 16th, 2021

By default, new Porter clusters will show the NGINX error percentage automatically, as long as Prometheus is installed. However, if you installed the cluster before April 16th, 2021, you will need to update the NGINX chart. Go to the "Applications" tab and select "All" for the Filter. You should click on the chart called `nginx-ingress` and click on the "DevOps Mode" button. Then click on the "Helm Values" tab. You can then copy/paste the following yaml into the values:

```yaml
controller:
  metrics:
    annotations:
      prometheus.io/port: '10254'
      prometheus.io/scrape: 'true'
    enabled: true
  podAnnotations:
    prometheus.io/port: '10254'
    prometheus.io/scrape: 'true'
```

> 🚧 Don't Overwrite YAML
> 
> **Warning:** careful not to overwrite existing yaml! You should merge any existing values with these values. 


Now click "Update Values". After a few seconds it should have reloaded, and you will be able to view the NGINX `5XX` error percentage.

