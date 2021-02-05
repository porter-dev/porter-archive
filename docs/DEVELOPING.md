### Development

```sh
docker-compose -f docker-compose.dev.yaml up --build
```

And then visit `localhost:8080` in the browser.

### Testing

From the root directory, run `go test ./...` to run all tests and ensure the builds/tests pass.

### Building

From the root directory, run `DOCKER_BUILDKIT=1 docker build . --file ./docker/Dockerfile -t porter`. Then you can run `docker run -p 8080:8080 porter`.

To build the test container, run `DOCKER_BUILDKIT=1 docker build . --file ./docker/Dockerfile -t porter-test --target porter-test`.

### CLI Release

```sh
docker run --rm --privileged \
-v $PWD:/go/src/github.com/porter-dev/porter \
-v /var/run/docker.sock:/var/run/docker.sock \
-w /go/src/github.com/porter-dev/porter \
-e GORELEASER_GITHUB_TOKEN='THEGITHUBTOKEN' \
mailchain/goreleaser-xcgo ""
```

### Dashboard

We use Prettier for all ts/tsx formatting. This will eventually be enforced rigorously.
