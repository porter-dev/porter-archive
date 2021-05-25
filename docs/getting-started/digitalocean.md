# Quick Installation
Porter runs on a Kubernetes cluster in your own Digital Ocean account. Digital Ocean is by far the easiest cloud provider to get set up on. You can provision a cluster through Porter by choosing Digital Ocean on Porter, then simply logging into your Digital Ocean account.

# Provisioning resources on Digital Ocean

After you select Digital Ocean, you'll see the screen below. Select which resources you'd want to provision in your account. Once you click **Submit**, you'll be redirected to Digital Ocean's login page.

![DigitalOcean redirect](https://files.readme.io/1722d09-Screen_Shot_2021-02-12_at_5.27.27_PM.png "Screen Shot 2021-02-12 at 5.27.27 PM.png")

After you log in, you'll see a message that says resources are being provisioned. This will take on average 15 minutes. Once the resources have been provisioned, refresh the page and you'll see a cluster connected to Porter. Before you start deploying, you need to first set up HTTPS and custom domain support for the cluster to expose your applications to external traffic. 

Follow the next guide to start deploying on your own domain, secured with HTTPS!