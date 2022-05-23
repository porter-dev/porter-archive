# syntax=docker/dockerfile:1.1.7-experimental

# Base Go environment
# -------------------
FROM golang:1.18-alpine as base
WORKDIR /porter

RUN apk update && apk add --no-cache gcc musl-dev git protoc

COPY go.mod go.sum ./
COPY /cmd ./cmd
COPY /internal ./internal
COPY /api ./api
COPY /ee ./ee
COPY /scripts ./scripts
COPY /provisioner ./provisioner
COPY /pkg ./pkg

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.26
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.1

RUN --mount=type=cache,target=$GOPATH/pkg/mod \
    go mod download

# Go build environment
# --------------------
FROM base AS build-go

# build proto files
RUN sh ./scripts/build/proto.sh

RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=$GOPATH/pkg/mod \
    go build -ldflags '-w -s' -a -tags ee -o ./bin/provisioner ./cmd/provisioner

# Go test environment
# -------------------
FROM base AS porter-test

RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=$GOPATH/pkg/mod \
    go test ./...

# Deployment environment
# ----------------------
FROM alpine
RUN apk update

COPY --from=build-go /porter/bin/provisioner /porter/

EXPOSE 8080
CMD /porter/provisioner
