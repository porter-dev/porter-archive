# Setting Up Slack Locally

For local versions of porter, one might want to have a slack notification bot running locally.
This tutorial will run you through the steps of setting up a bot with these capabilities:

## Step 1: Create Application and environment variables

Navigate to [https://api.slack.com/apps](), and click "Create New App" in the to right. On the modal that pops up, select
"from scratch" and then enter in your app name and workspace you want to develop in. On the page for the application
scroll down to "App Credentials" and take note of the following two values:

<img width="689" alt="Screen Shot 2021-08-09 at 10 25 41 AM" src="https://user-images.githubusercontent.com/25856165/128722685-28bd99c5-3a28-43cb-b002-356f6963a682.png">

Copy these values into the following environment variables in your local installation:
```
SLACK_CLIENT_ID=<client-id-above>
SLACK_CLIENT_SECRET=<client-secret-above>
```

## Step 2: Setting up oauth

The app also needs to be able to perform the oauth flow with the right callback link. To do this, 
navigate to "OAuth & Permissions" and add the url `https://yourdomain.com/api/oauth/slack/callback` to the list of 
redirect URLs:
![image](https://user-images.githubusercontent.com/25856165/128723683-c4fb2ac4-e0df-4989-9224-08806aadcb26.png)