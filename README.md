# Porter

For development:

```sh
docker-compose -f docker-compose.dev.yaml up --build
```

And then visit `localhost:8080` in the browser. 

### Testing

From the root directory, run `go test ./...` to run all tests and ensure the builds/tests pass. 

### Building

From the root directory, run `DOCKER_BUILDKIT=1 docker build . --file ./docker/Dockerfile -t porter`. Then you can run `docker run -p 8080:8080 porter`. 

To build the test container, run `DOCKER_BUILDKIT=1 docker build . --file ./docker/Dockerfile -t porter --target porter-test`. 