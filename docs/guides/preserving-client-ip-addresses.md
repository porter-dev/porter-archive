# AWS

> 🚧
> 
> Changing this configuration may result in a few minutes of downtime. It is recommended to set up client IP addresses before the application is live, or update it during a maintenance window. For more information, see [this Github issue](https://github.com/porter-dev/porter/issues/632#issuecomment-832939982).
 
You will need to update your NGINX config to support proxying external IP addresses to Porter.

In the `ingress-nginx` application, you'll be modifying the following Helm values:

```yaml
controller:
  config:
    use-proxy-protocol: 'true' # <-- CHANGE
  metrics:
    annotations:
      prometheus.io/port: '10254'
      prometheus.io/scrape: 'true'
    enabled: true
  podAnnotations:
    prometheus.io/port: '10254'
    prometheus.io/scrape: 'true'
  service:
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-proxy-protocol: '*'  # <-- CHANGE
      service.beta.kubernetes.io/aws-load-balancer-type: nlb-ip
```

![AWS nginx config](https://files.readme.io/26d96cf-Screen_Shot_2021-05-11_at_10.08.32_AM.png "Screen Shot 2021-05-11 at 10.08.32 AM.png")

# GCP 

> 🚧 Prequisites
> 
> You must have a health check endpoint for your application. This endpoint must return a `200 OK` status when it is pinged.

On Porter clusters provisioned through GCP, traffic flows through a regional TCP load balancer by default. These load balancers [do not support a proxy protocol](https://kubernetes.github.io/ingress-nginx/deploy/#gce-gke) (only global TCP load balancers or regional/global HTTP(S) load balancers support this), and thus the client IP cannot be accessed by using the default load balancer. As a result, to get client IP addresses to your applications, you must create a new load balancer with a custom IP address. This guide will show you how to do that. 

1. You must first create a static global IP address in the GCP console. You can do this by navigating to [External IP addresses](https://console.cloud.google.com/networking/addresses/list) (**VPC Network > External IP Addresses**), and clicking "Reserve External Address". Name this address something like `porter-ip-address` and select "Global" for the type:

![Global LB config](https://files.readme.io/5e56940-Screen_Shot_2021-05-10_at_2.25.04_PM.png "Screen Shot 2021-05-10 at 2.25.04 PM.png")

Copy the created IP address to the clipboard. 

2. In your DNS provider, configure a custom domain to point to that IP address, which you can do by creating an A record with your domain as the value. Check that the domain is pointing to the IP address through `nslookup <domain>`, where the address in the response should be the IP address you just created. 

3. Install an HTTPS issuer on the Porter dashboard by going to **Launch > Community Addons > HTTPS Issuer**. Toggle the checkbox **Create GCE Ingress**. If you have already installed the HTTPS issuer, you will have to delete your current issuer and create a new one. 

![HTTPS ingress with GCE](https://files.readme.io/a58e975-Screen_Shot_2021-05-10_at_4.12.27_PM.png "Screen Shot 2021-05-10 at 4.12.27 PM.png")

4. Create the web service by going to the Porter dashboard and navigating to **Launch > Web service**. Link up your source, and then configure the following three settings:

- Toggle "Configure Custom Domain" at the bottom of the "Main" tab, and add your custom domain. 

- Go to the "Advanced" tab. In the "Ingress Custom Annotations" section, add the following three parameters:

```yaml
cert-manager.io/cluster-issuer: letsencrypt-prod-gce
kubernetes.io/ingress.class: gce
kubernetes.io/ingress.global-static-ip-name: porter-ip-address # IMPORTANT: replace this with the name of your static ip address!
```

It should look something like this:

![Deployment config](https://files.readme.io/acdf9c2-Screen_Shot_2021-05-10_at_4.24.01_PM.png "Screen Shot 2021-05-10 at 4.24.01 PM.png")

- Still in the "Advanced" tab, you must set up a custom health check at an application endpoint. This is by default set to `/healthz`, but you can choose whichever path you'd like. This endpoint must return a `200 OK` status when it is pinged. 

![Healthz config](https://files.readme.io/9b5432a-Screen_Shot_2021-05-10_at_4.24.13_PM.png "Screen Shot 2021-05-10 at 4.24.13 PM.png")

5. Click "Deploy". It will take 10-15 minutes for the load balancer to be created and the certificates to be issued.
