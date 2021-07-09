# Configuring Github Access

> 🚧
>
> **Note:** Porter currently uses an oauth app to authenticate and gain access to repositories. This mechanism will be phased out
> over the next few weeks to transition to the authentication method below. After this, all old applications will still work as intended 
> but new applications will need to be authenticated through the GitHub Application.


Porter uses a GitHub application to authorize and gain access to your GitHub repositories. 
In order to see your repositories on the web application, you first need to authorize the application through oauth. 
You can do this by clicking "Account Settings" on the user dropdown on the top right and then authorizing the GitHub application through the link in the modal that appears.
After you authorize the application, you can open the modal again to install your application in either your account or any organization you are part of. 
Note that in organizations Porter will have access to every repository that the app is installed into regardless of who it was installed by. 
So, if your organization does not grant you access to install applications, having an admin install the application into the appropriate organization repositories is sufficient.