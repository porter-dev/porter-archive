Porter secures application endpoints with HTTPS and sets up custom domains using [cert-manager](https://cert-manager.io/) and [lets-encrypt](https://letsencrypt.org/). Below are the steps to set up custom domains on each cloud provider.

# Choosing between `A` and `CNAME` records
A basic rule of thumb you can follow whilst trying to choose between setting up an `A` records as opposed to a `CNAME` record for your cluster, is to see how your cluster's load balancer is exposed to the Internet. If your load balancer exposes a public IP, you should use an `A` record for your custom domain that points to the public IP - as is the case with GKE. If your load balancer exposes a FQDN, then you should use a `CNAME` record - this is common with EKS clusters that use AWS Network Load Balancers/Application Load Balancers.

# Amazon Web Services (AWS)

Porter provisions a EKS cluster and an ECR registry in your AWS account by default. Along with these resources, it also deploys both the `nginx-ingress` controller and cert-manager on the provisioned cluster - there is no need to separately install these components.

## Setting up HTTPS Issuer

1. Navigate to **Templates** tab and select the HTTPS issuer.

![HTTPS Issuer Template](https://files.readme.io/35f8f69-Screen_Shot_2021-01-18_at_6.22.17_PM.png "Screen Shot 2021-01-18 at 6.22.17 PM.png")

2. From the **Launch Template** view, select the `cert-manager` namespace. Enter the email you'd like to be contacted for HTTPS certificate related notifications, then hit **Deploy**. Now the cluster is ready to issue certificates for your endpoints. 

![Deploy HTTPS Issuer](https://files.readme.io/b733753-Screen_Shot_2021-01-18_at_7.14.26_PM.png "Screen Shot 2021-01-18 at 7.14.26 PM.png")

Follow the next section to start deploying with HTTPS and custom domains.

## Managing DNS

Before you can secure docker containers with HTTPS, you need to first set up appropriate DNS records in your DNS provider. When Porter creates a Kubernetes cluster on AWS, it also creates a load balancer. We will create either a CNAME or an ALIAS record that points to the DNS name of that load balancer.

### Using Route 53

To set up HTTPS on AWS via Porter on **domain apex that is not a subdomain** (e.g. `getporter.dev` ), we recommend you use Route 53 to manage DNS because it supports ALIAS records. Load Balancers on AWS are not assigned a static IP, which means your DNS record must point to a DNS name rather than an IP address. Route 53 supports ALIAS records that let you create an A record that points to another domain instead of an IP address. There are other DNS providers that support this feature, so please check with your DNS provider whether this is possible first.

If you've purchased your domain through another service like GoDaddy or Namecheap, you can still manage your DNS with Route 53 by simply changing the nameservers of your purchased domain. Please follow [this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html) to manage your existing domains with Route 53.

> 📘 ALIAS records are not necessary for subdomains
> 
> It is not necessary to use Route 53 or any DNS provider that supports ALIAS records if you only want to host subdomains on Porter. ALIAS records are only necessary for the domain apex.

### Set up DNS

1. You must first find the DNS name assigned to the load balancer of you cluster. Navigate to the **EC2** page in your AWS console, then select **Load Balancing > Load Balancer** from the sidebar. Click on the load balancer to view its DNS name. Check the **Instances** tab to ensure the load balancer is assigned to the correct Kubernetes cluster. 

![Load balancer instance](https://files.readme.io/21a5c96-Screen_Shot_2021-02-16_at_11.09.20_AM.png "Screen Shot 2021-02-16 at 11.09.20 AM.png")

2. Set up a DNS record that points to the DNS name copied from above. If you are setting up a subdomain, follow step 3. If you're setting up a domain apex (i.e. root domain), follow step 4. Note that in this tutorial, I will be using Amazon's Route 53 as an example DNS provider. 

3. (**For Subdomains**) Click on **Define simple record** and create a CNAME record that points a subdomain to the URL you have copied from step 2. Make sure you exclude the protocol `http://` and any trailing `/` from the URL string.

![CNAME record](https://files.readme.io/88b8b8a-Screen_Shot_2021-01-18_at_6.53.16_PM.png "Screen Shot 2021-01-18 at 6.53.16 PM.png")

4. (**For the domain apex - the root domain that is not a subdomain**) Leave the Record name empty and select the **Alias to Network Load Balancer** option. After you choose the region your EKS cluster is provisioned in, you will be able to select the URL you've copied from Step 2 from the dropdown menu. Set Record type as **A record** and create the record.

![A Record](https://files.readme.io/bdbd78d-Screen_Shot_2021-01-18_at_6.56.04_PM.png "Screen Shot 2021-01-18 at 6.56.04 PM.png")

> 🚧 It may take up to 30 minutes for DNS records to propagate
> 
> After you complete the previous steps, it might take up to 30 minutes for DNS records to fully propagate. Please wait before deploying your applications until the DNS propagation is complete. You can check this using tools like [dnschecker.org](https://dnschecker.org)

5. Almost there! Now return to the Porter Dashboard and deploy the Docker template with custom domain. Click on the **Configure Custom Domain** option, then enter the **Domain Name** you made the DNS record for, then hit **Deploy**. It may take a few minutes for certificates to be approved. After the certificate has been approved, you will see your application running on the custom domain secured with HTTPS.

![Custom domain deployment](https://files.readme.io/e3fcb37-Screen_Shot_2021-02-16_at_11.16.20_AM.png "Screen Shot 2021-02-16 at 11.16.20 AM.png")

6. **Optional.** To point the `www` subdomain to the deployed container along with the domain apex, you need to create a CNAME record for the `www` subdomain just like you did in step 5, then configure the Ingress of the deployed container to accept both the root domain and the `www` subdomain. 

To do this, toggle **DevOps Mode** on your deployed container and select the **Raw Values** tab.  Add the `www` subdomain to the ingress.hosts field as shown below, then hit **Deploy**. Again, it may take up to 15 minutes for the change to be reflected.

![WWW subdomain](https://files.readme.io/b76c57d-Screen_Shot_2021-01-18_at_7.09.37_PM.png "Screen Shot 2021-02-16 at 11.16.20 AM.png")

# Digital Ocean

Digital Ocean's Kubernetes cluster automatically assigns a load balancer with static IP to all ingresses of the cluster. You simply have to create an A record that points to the static IP of this load balancer.

1. Once Porter has provisioned the cluster on Digital Ocean, you will see a load balancer created on the Digital Ocean dashboard. Copy the static IP of this load balancer.

![Load balancer IP](https://files.readme.io/5270a2f-Screen_Shot_2021-01-19_at_10.03.05_AM.png "Screen Shot 2021-01-19 at 10.03.05 AM.png")

2. Go to your DNS provider and create an **A record** that points your domain to the static IP copied above. It may take around 15 minutes for DNS propagation to complete. You can use the [DNS checker](https://dnschecker.org/) to view progress.

3. Once DNS propagation is complete, deploy the **HTTPS Issuer** template to the `cert-manager` namespace from the Porter Dashboard. Enter the email you'd like to receive any updates about the certificate that will be issued (e.g. expiry date).

![Email address](https://files.readme.io/17ef5b6-Screen_Shot_2021-01-18_at_6.22.17_PM.png "Screen Shot 2021-01-18 at 6.22.17 PM.png")

4. Deploy a Docker template from the Porter dashboard with the **Configure Custom Domain** option. Type in **"digitalocean"** as your provider and your domain name without the protocol (i.e. https:// or http://), then hit deploy.

![DigitalOcean HTTPS provider](https://files.readme.io/4086a19-Screen_Shot_2021-01-19_at_10.08.06_AM.png "Screen Shot 2021-01-19 at 10.08.06 AM.png")

5. **Optional.** To point the `www` subdomain to the deployed container along with the domain apex, you need to create an A record for the `www` subdomain just like you did in step 2, then configure the Ingress of the deployed container to accept both the root domain and the `www` subdomain.

To do this, toggle **DevOps Mode** on your deployed container and select the **Raw Values** tab.  Add the `www` subdomain to the ingress.hosts field as shown below, then hit **Deploy**. Again, it may take around 15 minutes for the change to be reflected.

![WWW subdomain](https://files.readme.io/cbeb2da-Screen_Shot_2021-01-18_at_7.09.37_PM.png "Screen Shot 2021-01-18 at 7.09.37 PM.png")

# Google Cloud Platform (GCP)

During cluster provisioning, Porter automatically reserves a static IP and assigns it to a load balancer that forwards traffic to the nginx-ingress controller. To configure custom domains and HTTPS, you simply need to create an A record that points your domain to the static IP that has been reserved.

1. Visit the **External IP addresses** section on Google Cloud Console. You'll see an IP with a name that looks like `k8s-${cluster_name}-cluster-lb`. Copy this IP address.

2. Go to your DNS provider and create an **A record** that points your domain to the static IP you have copied from step 1. It may take around 15 minutes for DNS propagation to complete. You can use the [DNS checker](https://dnschecker.org/) to view progress.

3. Once DNS propagation is complete, deploy the **HTTPS Issuer** template to the `cert-manager` namespace from the Porter Dashboard. Enter the email you'd like to receive any updates about the certificate that will be issued (e.g. expiry date).

![Email HTTPS issuer](https://files.readme.io/7f0c594-Screen_Shot_2021-05-07_at_8.18.06_PM.png "Screen Shot 2021-05-07 at 8.18.06 PM.png")

4. After you've deployed the **HTTPS Issuer**, deploy a Docker template from the Porter dashboard with the **Configure Custom Domain** option. Type in **"gcp"** as your provider and your domain name without the protocol (i.e. https:// or http://). Then hit deploy.

![GCP configure custom domain](https://files.readme.io/dadeb05-Screen_Shot_2021-01-29_at_12.44.23_AM.png "Screen Shot 2021-01-29 at 12.44.23 AM.png")

5. **Optional.** To point the `www` subdomain to the deployed container along with the domain apex, you need to create an A record for the `www` subdomain just like you did in step 2, then configure the Ingress of the deployed container to accept both the root domain and the `www` subdomain.

To do this, toggle **DevOps Mode** on your deployed container and select the **Raw Values** tab.  Add the `www` subdomain to the ingress.hosts field as shown below, then hit **Deploy**. Again, it may take around 15 minutes for the change to be reflected.

![WWW domain configuration](https://files.readme.io/d5e286b-Screen_Shot_2021-01-18_at_7.09.37_PM.png "Screen Shot 2021-01-18 at 7.09.37 PM.png")

# Wildcard Domains

It is possible to set up a wildcard domain so that you don't have to keep creating DNS records every time you create a deployment. At the moment, this is only supported on Digital Ocean clusters.

## Digital Ocean

### Prerequisites

1. From your DNS provider, point the nameservers of your domain to Digital Ocean. You can find provider specific ways to do this [here](https://www.digitalocean.com/community/tutorials/how-to-point-to-digitalocean-nameservers-from-common-domain-registrars).

2. Create a personal access token on Digital Ocean. Visit this [direct link](https://cloud.digitalocean.com/account/api/tokens/new) to create a token. If this doesn't work, see this [documentation](https://docs.digitalocean.com/reference/api/create-personal-access-token/).

### Setting up the Wildcard Domain

1. Once the nameservers of your domain have been swapped out, [create an A record for your wildcard domain](https://docs.digitalocean.com/products/networking/dns/how-to/manage-records/#a-records). Make sure that the A record you create points at the load balancer attached to the Kubernetes cluster provisioned through Porter.

2. Once DNS propagation is complete, deploy the **HTTPS Issuer** template to the `cert-manager` namespace from the Porter Dashboard. 

![HTTPS issuer deployment](https://files.readme.io/231ad37-Screen_Shot_2021-05-07_at_8.18.06_PM.png "Screen Shot 2021-05-07 at 8.18.06 PM.png")

3. Enter the email you'd like to receive any updates about the certificate that will be issued (e.g. expiry date). Enable the wildcard domain, copy your personal access token and input the wildcard domain you have made the A record for in step 1. Then hit the **Deploy** button. 

![Deploy HTTPS issuer](https://files.readme.io/3a6e36c-Screen_Shot_2021-05-07_at_8.20.30_PM.png "Screen Shot 2021-05-07 at 8.20.30 PM.png")

It might take a few minutes for the HTTPS Issuer instance to be ready. To be safe, wait 5~10 minutes before you start creating deployments that use the wildcard domain.

### Using the wildcard domain

1. From the **Web Service** view, click **Enable Custom Domains**. Put in the name of the domain you'd like to expose your web service on and make sure it matches the wildcard domain you have configured in the previous section. Then toggle the **Use wildcard domain** option. 

![Wildcard domain option](https://files.readme.io/8fbcb3f-Screen_Shot_2021-05-07_at_8.26.23_PM.png "Screen Shot 2021-05-07 at 8.26.23 PM.png")

After you hit deploy, it might take a few minutes for the endpoint to be secured with HTTPS. Once that's done, you will be able to access endpoints on the domain you have specified. 

With wildcard domain enabled, you can create deployments and expose them on domains without having to create another DNS record, as long as the domain matches the wildcard domain.