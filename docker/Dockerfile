# syntax=docker/dockerfile:1.1.7-experimental

# Build environment for app
# -------------------------
FROM golang:1.15-alpine as build-env-1
WORKDIR /porter

RUN apk update && apk add --no-cache gcc musl-dev git

COPY go.mod go.sum ./
COPY /cmd ./cmd
COPY /internal ./internal
COPY /server ./server

RUN --mount=type=cache,target=$GOPATH/pkg/mod \
    go mod download

RUN --mount=type=cache,target=/root/.cache/go-build \
    go build -ldflags '-w -s' -a -o ./bin/app ./cmd/app && \
    go build -ldflags '-w -s' -a -o ./bin/migrate ./cmd/migrate
    
# Build environment for dashboard
# -------------------------------
FROM node:latest as build-env-2
WORKDIR /webpack

COPY ./dashboard ./

RUN npm i

ENV NODE_ENV=production

# COPY /dashboard/src /webpack/src

RUN npm run build

# Deployment environment
# ----------------------
FROM alpine
RUN apk update

COPY --from=build-env-1 /porter/bin/app /porter/
COPY --from=build-env-1 /porter/bin/migrate /porter/
COPY --from=build-env-2 /webpack/build /porter/static

ENV DEBUG=false
ENV STATIC_FILE_PATH=/porter/static
ENV SERVER_PORT=8080
ENV SERVER_TIMEOUT_READ=5s
ENV SERVER_TIMEOUT_WRITE=10s
ENV SERVER_TIMEOUT_IDLE=15s

ENV COOKIE_SECRETS=secret

ENV QUICK_START=true

EXPOSE 8080
CMD /porter/migrate && /porter/app
