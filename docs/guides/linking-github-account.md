# Configuring Github Access

> 🚧
>
> **Note:** Porter currently uses an oauth app to authenticate and gain access to repositories. This mechanism will be phased out
> over the next few weeks to transition to the authentication method below. After this, all old applications will still work as intended 
> but new applications will need to be authenticated through the GitHub Application.

Porter uses a GitHub application to authorize and gain access to your GitHub repositories. In order to be able to deploy
applications through GitHub repositories, you must first authorize the Porter GitHub application to have
access to them.

## Step 1: Authorize the Porter Application

On your home page, click select "Account Settings" through the dropdown on the top right and click "connect your GitHub account"
in the popup that opens:

![image](https://user-images.githubusercontent.com/25856165/125105942-0acb6d00-e0ad-11eb-8254-6660d390daea.png)

Then, follow the GitHub steps to authorize the application.

## Step 2: Install App in your repositories

Once the Application is authorized, you can see a list of accounts and organization the Porter has access to 
through the same popup:

![image](https://user-images.githubusercontent.com/25856165/125106692-ee7c0000-e0ad-11eb-9c79-44714f898aa5.png)

You can install the app into more repositories by clicking on "Install Porter in more repositories". Note that if you are part of an organization, Porter will show you access to every repository that the app is installed into regardless of who it was installed by. 
So, if your organization does not grant you access to install applications, having an admin install the application into the appropriate repositories is sufficient.