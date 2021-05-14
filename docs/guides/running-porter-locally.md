While it requires a few additional steps, it is possible to run Porter locally. These are the steps to start using Porter on your local machine.

1. [Install our CLI](https://docs.getporter.dev/docs/cli-documentation#installation)

2. Run `porter server start`. This will spin up a local Porter instance on port 8080.

By default, GitHub login and the deploying from GitHub repo is disabled on the local version of Porter - this is due to security reasons. However, you can add these functionalities to your local instance by creating your own GitHub OAuth application. These are the steps to enable the GitHub features on the local version of Porter:

1. [Create a new GitHub Oauth App](https://docs.github.com/en/developers/apps/creating-an-oauth-app). This app should be created with `http://localhost:8080/api/oauth/github/callback` as the callback URL. 

2. Copy the Client ID and the Client secrets. Then add these lines into your `.bashrc` file:

```txt
export GITHUB_CLIENT_ID=YOUR_CLIENT_ID
export GITHUB_CLIENT_SECRET=YOUR_CLIENT_SECRET
export GITHUB_ENABLED=true
```

3. When you run `porter server start`, Porter will automatically read these variables in and enable the GitHub features.