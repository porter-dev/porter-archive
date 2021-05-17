When you delete your project or clusters, Porter automatically destroys your resources so you don't get charged for any unused resources. Sometimes, this automatic destruction occurs only partially and results in dangling resources. This is a guide with specific steps on how to delete these resources for each cloud provider.

# AWS

## Deleting VPC

Navigate to the **VPC** section in your AWS console to see the VPC's that are currently in use. Select the VPC that belongs to the cluster you've provisioned, then click **Actions > Delete VPC**. 

![Delete VPC](https://files.readme.io/a33b774-Screen_Shot_2021-03-26_at_4.05.16_PM.png "Screen Shot 2021-03-26 at 4.05.16 PM.png")

AWS might warn you that the VPC cannot be deleted due to existing NAT gateways or network interfaces that are in use. Click on the text **NAT Gateways** to view the NAT gateway in use. Once you delete the NAT gateway, you'll be able to delete the VPC.

![NAT gateway](https://files.readme.io/61a972f-Screen_Shot_2021-03-26_at_4.09.51_PM.png "Screen Shot 2021-03-26 at 4.09.51 PM.png")

##  Deleting Elastic IP

Head to the **Elastic IP addresses** section in the VPC tab. Select the EIP of the cluster you have deleted and click **Actions > Release Elastic IP Addresses**.

## Deleting EKS 

Head to the **EKS** tab, select the cluster and click **Delete** .

![EKS](https://files.readme.io/0d4635a-Screen_Shot_2021-03-26_at_4.16.01_PM.png "Screen Shot 2021-03-26 at 4.16.01 PM.png")

## Deleting Nodes

It sometimes occurs that even after the EKS cluster has been deleted, the actual **EC2 machines** comprising the cluster do not get deleted properly. Navigate to **EC2 > Autoscaling Groups** and ensure that autoscaling groups attached to your cluster has been deleted. **If this autoscaling group persists, AWS will continue to spin back up your nodes even after manual deletion.** 

Once you've deleted the **Autoscaling Group**, head to **EC2 > Instances** and delete all the nodes. 

![Autoscaling group](https://files.readme.io/fad5baf-Screen_Shot_2021-03-26_at_4.24.08_PM.png "Screen Shot 2021-03-26 at 4.24.08 PM.png")