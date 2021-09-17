# syntax=docker/dockerfile:1.1.7-experimental

# Base Go environment
# -------------------
FROM golang:1.15-alpine as base
WORKDIR /porter

RUN apk update && apk add --no-cache gcc musl-dev git make

COPY go.mod go.sum ./
COPY /cli ./cli
COPY /internal ./internal
COPY /api ./api

RUN --mount=type=cache,target=$GOPATH/pkg/mod \
    go mod download

# Go build environment
# --------------------
FROM base AS build-go

ARG version=production

RUN make build-cli

# Deployment environment
# ----------------------
FROM alpine
RUN apk update

COPY --from=build-go /porter/bin/porter .

RUN chmod +x ./porter && mv ./porter /usr/local/bin/

ENTRYPOINT ["porter"]
