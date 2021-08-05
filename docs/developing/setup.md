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

Once you've done this, go to the root repository, and run `docker-compose -f docker-compose.dev.yaml up`. You should see postgres, webpack, and porter containers spin up. When the webpack and porter containers have finished compiling and have spun up successfully (this will take 5-10 minutes after the containers start), you can navigate to `localhost:8080` and you should be greeted with the "Log In" screen.

Next, register your admin account. Once it's complete, it will ask you to verify your email; we will manually verify it through Postgres.

Open your terminal in the root repository and enter:

`psql --host localhost --port 5400 --username porter --dbname porter -W`

It will promt you for a password. Enter `porter`

Next, update your email in the database to `verified":

`UPDATE users SET email_verified='t' WHERE id=1;`

At this point, you can make a change to any `.go` file to trigger a backend rebuild, and any file in `/dashboard/src` to trigger a hot reload.

## Setup for WSL

Follow the steps to install WSL on Windows here https://docs.microsoft.com/en-us/windows/wsl/install-win10

### Requirements

`sudo apt install xdg-utils` <br/>
`sudo apt install postgres`

### Setup Proccess

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