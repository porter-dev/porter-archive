While it requires a few additional steps, it is possible to run Porter locally. Porter can either be run inside a Docker container, or the binary can be run directly.

## Running the Binary

To run the Porter binary, follow these steps: 

1. [Install our CLI](https://docs.getporter.dev/docs/cli-documentation#installation)

2. Run `porter server start`. This will spin up a local Porter instance on port 8080.

3. Navigate to http://localhost:8080/register, and create a new user with an email and password. 

## Running with Docker

The easiest way to run the Docker container is to use SQLite as the persistence option. To accomplish this, you can simply run:

```
docker volume create porter_sqlite
docker run \
  --mount type=volume,source=porter_sqlite,target=/sqlite,readonly=false \
  -e REDIS_ENABLED=false \
  -e SQL_LITE_PATH=/sqlite/porter.db \
  -p 8080:8080 \
  -d porter1/porter:latest
```

Then navigate to http://localhost:8080/register, and create a new user with an email and password. 

## Setting up Integrations

While basic functionality is supported on the local binary/Docker image, more configuration is required to support various integrations. See [this document](https://docs.porter.run/docs/sso) for instructions on adding integrations like Github application access.
