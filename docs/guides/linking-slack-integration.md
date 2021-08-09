# Configuring Slack Integration

Porter has a Slack application that you can install into a channel of any workspace you're part of. This app will send notifications on updates to your deployments.

## Installing Application

To install the Slack application, navigate to the **Integrations** section on the left and click **Slack**. Then, click **Install Application** in the top right:

![image](https://user-images.githubusercontent.com/25856165/128559944-d14cb6f9-8bfd-4294-8ed1-5455f3c3304d.png)

Next, install the application into the relevant workspace (top right) and channel. Note that you can install the same app into multiple channels in one workspace.

![image](https://user-images.githubusercontent.com/25856165/128560147-ab5308db-ec0c-49f2-a2c8-9405f205665b.png)

After that, the application should show up in the Slack integrations tab:

![image](https://user-images.githubusercontent.com/25856165/128560472-bd4d35c3-31d5-4ee1-b137-206d3b914c13.png)

## Uninstalling Application

To delete the Slack application from a channel, first click the icon next to the delete icon, which will bring you to the Slack configuration page. From this page, you can revoke the Slack app's access to your workspace. Next, click the garbage icon on the relevant integration:

![image](https://user-images.githubusercontent.com/25856165/128560956-35b5051d-cb7e-49d7-bc70-b26cfdd718f8.png)

This will delete the application data on the Porter side, which will prevent it from attempting to send notifications. 
