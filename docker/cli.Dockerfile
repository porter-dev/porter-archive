# syntax=docker/dockerfile:1.1.7-experimental

# Base Go environment
# -------------------
# pinned because of https://github.com/moby/moby/issues/45935
FROM golang:1.20.5 as base
WORKDIR /porter

RUN apt-get update && apt-get install -y gcc musl-dev git make

COPY go.mod go.sum ./
COPY Makefile .
COPY /cli ./cli
COPY /internal ./internal
COPY /api ./api
COPY /pkg ./pkg
COPY /provisioner ./provisioner

RUN --mount=type=cache,target=$GOPATH/pkg/mod \
    go mod download

# Go build environment
# --------------------
FROM base AS build-go

ARG version=production

RUN make build-cli

# Deployment environment
# ----------------------
FROM ubuntu:latest

ENV KUBE_VERSION="v1.29.0"
ENV HELM_VERSION="v3.13.3"

RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates wget apt-utils && \
    wget -q https://storage.googleapis.com/kubernetes-release/release/${KUBE_VERSION}/bin/linux/amd64/kubectl -O /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl && \
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

COPY --from=build-go /porter/bin/porter .

RUN chmod +x ./porter && mv ./porter /usr/local/bin/

ENTRYPOINT ["porter"]
