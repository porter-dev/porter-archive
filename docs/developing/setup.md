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

Once you've done this, go to the root repository, and run `docker-compose -f docker-compose.dev.yaml up`. You should see postgres, webpack, and porter containers spin up. When the webpack and porter containers have finished compiling and have spun up successfully (this will take 5-10 minutes after the containers start), you can navigate to `localhost:8080` and you should be greeted with the "Log In" screen. At this point, you can make a change to any `.go` file to trigger a backend rebuild, and any file in `/dashboard/src` to trigger a hot reload.