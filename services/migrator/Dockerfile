# syntax=docker/dockerfile:1.1.7-experimental

# Base Go environment
# -------------------
FROM golang:1.15-alpine as base
WORKDIR /porter

RUN apk update && apk add --no-cache gcc musl-dev git

COPY go.mod go.sum ./
COPY /cmd ./cmd
COPY /internal ./internal
COPY /api ./api
COPY /ee ./ee

RUN --mount=type=cache,target=$GOPATH/pkg/mod \
    go mod download

# Go build environment
# --------------------
FROM base AS build-go

ARG version=production

RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=$GOPATH/pkg/mod \
    go build -ldflags '-w -s' -a -tags ee -o ./bin/migrate ./cmd/migrate

# Deployment environment
# ----------------------
FROM alpine
RUN apk update

COPY --from=build-go /porter/bin/migrate /porter/
CMD /porter/migrate
