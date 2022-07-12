# Environment to build the worker pool binary
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

# Deployment environment
# ----------------------
FROM alpine:3.16
WORKDIR /app

RUN apk update && apk add git

COPY --from=build /app/bin/worker-pool /usr/bin/

ENTRYPOINT [ "worker-pool" ]
