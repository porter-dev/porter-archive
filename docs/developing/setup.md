> **Note:** if you run into any issues at all, don't hesitate to reach out on the **#contributing** channel in [Discord](https://discord.gg/GJynMR3KXK)!

### Table of Contents

- [Getting Started](#getting-started)
  - [Makefile Quickstart](#makefile-quickstart)
  - [Docker Quickstart](#docker-quickstart)
    - [Getting PostgreSQL Access](#getting-postgresql-access)
- [Project and Cluster Setup](#project-and-cluster-setup)
  - [Setting up a Cluster](#setting-up-a-cluster)
  - [Minikube on MacOS](#minikube-on-macos)
- [Setup for WSL](#setup-for-wsl)
- [Secure Localhost Setup](#secure-localhost-setup)

# Getting Started

## Makefile Quickstart

> Prequisites: [Go 1.15+](https://golang.org/doc/install) installed and [Node.js/npm](https://nodejs.org/en/download/) installed.

If working under a bash environment, the easiest way to get started is by running `make start-dev`. This will verify that `go`, `npm` and `node` are found in your path, and will start a development server on `localhost:8081` with live reloading set up for both the backend and frontend. After the services are running successfully, go to [project and cluster setup](#project-and-cluster-setup) to complete the set up. 

## Docker Quickstart

After forking and cloning the repo, you should save two `.env` files in the repo.

First, in `/dashboard/.env`:

```
NODE_ENV=development
API_SERVER=localhost:8080
```

Next, in `/docker/.env`:

```
SERVER_URL=http://localhost:8080
SERVER_PORT=8080
DB_HOST=postgres
DB_PORT=5432
DB_USER=porter
DB_PASS=porter
DB_NAME=porter
SQL_LITE=false
```

Once you've done this, go to the root repository, and run `docker-compose -f docker-compose.dev.yaml up`. You should see postgres, webpack, and porter containers spin up. When the webpack and porter containers have finished compiling and have spun up successfully (this will take 5-10 minutes after the containers start), .

At this point, you can make a change to any `.go` file to trigger a backend rebuild, and any file in `/dashboard/src` to trigger a hot reload.

### Getting PostgreSQL Access

The `docker-compose` command automatically starts a PostgreSQL instance on port 5400. You can get `psql` access by running the following:

`psql --host localhost --port 5400 --username porter --dbname porter -W`

This will prompt you for a password. Enter `porter`, and you should see the `psql` shell!

# Project and Cluster Setup

After the project has spun up, you can navigate to `localhost:8081` (for `make` quickstart) or `localhost:8080` (for `docker-compose` quickstart) and you should be greeted with the "Log In" screen. Create a user by entering an email/password on the "Register" screen. 

## Setting up a Cluster 

These steps will help you get set up with a minikube cluster that can be used for development. Prerequisities:

- `kubectl` installed locally
- Development instance of Porter is running
- Download the [Porter CLI](https://docs.porter.run/docs/cli-documentation#installation) or build it using `make build-cli`

At the moment, we only have instructions for setting up [Minikube on MacOS](#minikube-on-macos). However, Porter is compatible with most Kubernetes clusters, as long as the server is reachable from your host network. To connect a cluster that is currently accessible via `kubectl`, you can run the following steps:

1. `porter config set-host http://localhost:8080` (for `docker-compose` quickstart) or `porter config set-host http://localhost:8081` (for `make` quickstart). 
2. `porter auth login`
3. `porter connect kubeconfig` 

If you now navigate to `http://localhost:8080`, you should see the minikube cluster attached! There will be some limitations:

- **When you launch a web application, it is not possible to expose a service that you create. Whenever you create a web service, de-select the "Expose to external traffic" option.**

### Minikube on MacOS

1. [Install minikube](https://minikube.sigs.k8s.io/docs/start/), and install the `hyperkit` driver. The easiest way to do this is via:

```sh
brew install minikube
brew install hyperkit
```

2. Start minikube with the `hyperkit` driver:

```sh
minikube start --driver hyperkit
```

3. Make sure that you've downloaded the latest version of the Porter CLI, and that your development version of Porter is running. Then run:

```sh
porter config set-host http://localhost:8080
porter auth login
```

4. Make sure that `minikube` is selected as the current context (`kubectl config current-context`), and then run:

```sh
porter connect kubeconfig
```

## Setting your email to be verified

If you are getting blocked out of the dashboard because your email is not verified (fixed in `v0.6.2` of Porter, so make sure you've pulled from `master` recently), you can update your email in the database to `verified":

`UPDATE users SET email_verified='t' WHERE id=1;`

# Setup for WSL

Follow the steps to install WSL on Windows here: https://docs.microsoft.com/en-us/windows/wsl/install-win10

```sh
sudo apt install xdg-utils
sudo apt install postgresql
```

Once WSL is installed, head to Docker Desktop and enable WSL Integration.

![Docker Enable WSL Integration](https://i.imgur.com/QzMyxQx.png)

# Secure Localhost Setup

Sometimes, it may be necessary to serve securely over `https://localhost` (for example, required by Slack integrations). Run the following command from the repository root:

```sh
openssl req -x509 -out ./docker/localhost.crt -keyout ./docker/localhost.key \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

Update `./docker/.env` with the following:

```
SERVER_URL=https://localhost
```

If using Chrome, paste the following into the Chrome address bar:

> chrome://flags/#allow-insecure-localhost

And then Enable the **Allow invalid certificates for resources loaded from localhost** field.

Finally, run `docker-compose -f docker-compose.dev-secure.yaml up` instead of the standard docker-compose file.
