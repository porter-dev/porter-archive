# Setup GitHub App Locally

1. Follow the instructions from https://docs.porter.run/docs/github#setting-up-github-repository-integrations (Only from the `Setting Up Github Repository Integrations` section)
2. Download the `ngrok` CLI tool from https://ngrok.com
3. Expose the local Porter instance by calling `ngrok http 8080` from a shell (you might have to login with an `ngrok` account). This is going to emit a `*.ngrok.io` subdomain something like
```
Forwarding http://a7af-103-98-78-24.ngrok.io -> http://localhost:8080
```
4. Open the GitHub app settings by going to https://github.com/settings/apps and select the app you created in step 1 by clicking the `Edit` button.
5. Go to the `Webhook` section and update the `Webhook URL` to `<generated ngrok domain in step 3>/api/integrations/github-app/webhook`. So in the case of the above example, it will be `http://a7af-103-98-78-24.ngrok.io/api/integrations/github-app/webhook`
6. Open your local Porter instance by going to `http://localhost:8081` and you should now be able to now install your own GitHub app!