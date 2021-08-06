# Configuring Slack Integration

Porter has a slack application that you can install into a channel of any workspace you're part of.
This app will send notification on updates to your deployments.

## Installing Application

To install the slack application, navigate to the "integrations" section on the 
left and click "slack". Then, click install application in the top right:

![image](https://user-images.githubusercontent.com/25856165/128559944-d14cb6f9-8bfd-4294-8ed1-5455f3c3304d.png)

Then, install the application into the relevant workspace (top right) and channel. Note that you can install the same
app into multiple channels in one worksapce.

![image](https://user-images.githubusercontent.com/25856165/128560147-ab5308db-ec0c-49f2-a2c8-9405f205665b.png)

After that, the application should show up in the slack integrations tab:

![image](https://user-images.githubusercontent.com/25856165/128560472-bd4d35c3-31d5-4ee1-b137-206d3b914c13.png)

## Uninstalling Application

To delete an application from a channel, click the garbage icon on the relevant integration:

![image](https://user-images.githubusercontent.com/25856165/128560956-35b5051d-cb7e-49d7-bc70-b26cfdd718f8.png)

This will delete the application data on the side of porter (which will prevent it from sending notifications), but not
on the side of slack, click the icon next to the garbage icon to navigate to a page where you can revoke the apps access to 
your workspace.