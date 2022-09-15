# This Dockerfile is used for building the worker pool binary itself

# Buildtime environment
# -------------------------------------------
FROM golang:1.18-alpine3.16 as build
WORKDIR /app

RUN apk update && apk add gcc binutils-gold musl-dev

COPY go.mod .
COPY go.sum .
COPY /api ./api
COPY /ee ./ee
COPY /internal ./internal
COPY /pkg ./pkg
COPY /provisioner ./provisioner
COPY /workers ./workers

RUN go build -ldflags '-w -s' -tags ee -a -o ./bin/worker-pool ./workers

# Runtime environment
# ----------------------
FROM alpine:3.16
WORKDIR /app

RUN apk update && apk add curl

COPY --from=build /app/bin/worker-pool /usr/bin/
COPY /internal/opa/config.yaml /app/opa/config.yaml
COPY /internal/opa/policies /app/opa/policies

ENV OPA_CONFIG_FILE_DIR /app/opa

ENTRYPOINT [ "worker-pool" ]
