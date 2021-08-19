# Getting Started

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

Once you've done this, go to the root repository, and run `docker-compose -f docker-compose.dev.yaml up`. You should see postgres, webpack, and porter containers spin up. When the webpack and porter containers have finished compiling and have spun up successfully (this will take 5-10 minutes after the containers start), you can navigate to `localhost:8080` and you should be greeted with the "Log In" screen. Create a user by entering an email/password on the "Register" screen.

At this point, you can make a change to any `.go` file to trigger a backend rebuild, and any file in `/dashboard/src` to trigger a hot reload.

## Setup without docker

While docker is an awesome way of getting started as it simulates the real environment that we use on our hosted dashboard, for some people this may bee too much.

In order to decrease the complexity of all the environment, you can just run the development environment locally without docker.

After cloning the repo you should only execute `make start-dev` this will ask you to install the dependencies and also run the server and the frontend in a single console.
It will also create some env files with default values that will simplify the process!

### Disclaimer

For the command `make start-dev` to work, you should be working under a bash environment (WSL on windows, Linux or MacOS), also you will need go, node and npm installed
for it to work.

### Disclaimer

This environment is experimental, if you run into any issue don't doubt in contact us through our [discord!](https://discord.gg/GJynMR3KXK)

## Getting PostgreSQL Access

You can get `psql` access by running the following:

`psql --host localhost --port 5400 --username porter --dbname porter -W`

This will prompt you for a password. Enter `porter`, and you should see the `psql` shell!

### Setting your email to be verified

If you are getting blocked out of the dashboard because your email is not verified (fixed in `v0.6.2` of Porter, so make sure you've pulled from `master` recently), you can update your email in the database to `verified":

`UPDATE users SET email_verified='t' WHERE id=1;`

## Setting up Minikube

These steps will help you get set up with a minikube cluster that can be used for development. Prerequisities:

- `kubectl` installed locally
- Development instance of Porter is running

Following the OS-specific steps to get minikube running:

- [MacOS](#macos)
- [Linux](#linux)

If you now navigate to `http://localhost:8080`, you should see the minikube cluster attached! There will be some limitations:

- **It is not possible to expose a service that you create. Whenever you create a web service, de-select the "Expose to external traffic" option.**

### MacOS

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

## Setup for WSL

Follow the steps to install WSL on Windows here https://docs.microsoft.com/en-us/windows/wsl/install-win10

### Requirements

`sudo apt install xdg-utils` <br/>
`sudo apt install postgresql`

### Setup Process

Once WSL is installed, head to docker and enable WSL Integration.
![Docker Enable WSL Integration](https://i.imgur.com/QzMyxQx.png)

Next, continue with the Getting Started Section

## Secure Localhost Setup

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
