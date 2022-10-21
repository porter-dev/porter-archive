#!/usr/bin/env bash

env_file_path="docker/.env"
ngrok_url=""

command -v ngrok >/dev/null 2>&1 || { echo "[ERROR] ngrok is required to test Preview Environments locally" >&2; exit 1; }

if [ -f "$env_file_path" ]; then
    env_vars="$(cat "$env_file_path" | grep -v "^#" | sed -r "/^\s*$/d" | sed "s/\#.*//")"
    IFS="="
    serverURLSet=0
    githubAppClientIDSet=0
    githubAppClientSecretSet=0
    githubAppWebhookSecretSet=0
    githubAppNameSet=0
    githubAppIDSet=0
    githubAppSecretPathSet=0
    githubIncomingWebhookSecretSet=0
    while read -r k v; do
        if [[ "$k" == "SERVER_URL" ]]; then
            if [[ "$v" != *"ngrok.io"* ]]; then
                echo "[ERROR] SERVER_URL must be set to an ngrok.io URL."
                exit 1
            fi

            serverURLSet=1
            ngrok_url="$v"
        elif [[ "$k" == "GITHUB_APP_CLIENT_ID" ]]; then
            githubAppClientIDSet=1
        elif [[ "$k" == "GITHUB_APP_CLIENT_SECRET" ]]; then
            githubAppClientSecretSet=1
        elif [[ "$k" == "GITHUB_APP_WEBHOOK_SECRET" ]]; then
            githubAppWebhookSecretSet=1
        elif [[ "$k" == "GITHUB_APP_NAME" ]]; then
            githubAppNameSet=1
        elif [[ "$k" == "GITHUB_APP_ID" ]]; then
            githubAppIDSet=1
        elif [[ "$k" == "GITHUB_APP_SECRET_PATH" ]]; then
            githubAppSecretPathSet=1
        elif [[ "$k" == "GITHUB_INCOMING_WEBHOOK_SECRET" ]]; then
            githubIncomingWebhookSecretSet=1
        fi
    done <<< "$env_vars"

    if [[ "$serverURLSet" == "0" ]]; then
        echo "[ERROR] SERVER_URL must be set to an ngrok.io URL."
        exit 1
    elif [[ "$githubAppClientIDSet" == 0 ]]; then
        echo "[ERROR] GITHUB_APP_CLIENT_ID must be set"
        exit 1
    elif [[ "$githubAppClientSecretSet" == 0 ]]; then
        echo "[ERROR] GITHUB_APP_CLIENT_SECRET must be set"
        exit 1
    elif [[ "$githubAppWebhookSecretSet" == 0 ]]; then
        echo "[ERROR] GITHUB_APP_WEBHOOK_SECRET must be set"
        exit 1
    elif [[ "$githubAppNameSet" == 0 ]]; then
        echo "[ERROR] GITHUB_APP_NAME must be set"
        exit 1
    elif [[ "$githubAppIDSet" == 0 ]]; then
        echo "[ERROR] GITHUB_APP_ID must be set"
        exit 1
    elif [[ "$githubAppSecretPathSet" == 0 ]]; then
        echo "[ERROR] GITHUB_APP_SECRET_PATH must be set"
        exit 1
    elif [[ "$githubIncomingWebhookSecretSet" == 0 ]]; then
        echo "[ERROR] GITHUB_INCOMING_WEBHOOK_SECRET must be set"
        exit 1
    fi
else
    echo "[ERROR] docker/.env should be set with the required variables"
    exit 1
fi

echo "[SUCCESS] All required variables are set. MAKE SURE your GitHub app has all URLs set to $ngrok_url."
