# Environment to build the worker pool binary
# -------------------------------------------
FROM golang:1.18-alpine3.16 as build
WORKDIR /app

RUN apk update && apk add gcc musl-dev

COPY . .

RUN go build -ldflags '-w -s' -tags ee -a -o ./bin/worker-pool .

# Deployment environment
# ----------------------
FROM alpine:3.16
WORKDIR /app

RUN apk update && apk add git

COPY --from=build /app/bin/worker-pool /usr/bin/

ENTRYPOINT [ "worker-pool" ]
