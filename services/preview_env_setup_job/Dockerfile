# Build
FROM golang:1.20-alpine as base

WORKDIR /app
COPY . .

RUN apk update && apk add --no-cache gcc musl-dev git protoc
ARG CGO_ENABLED=0

RUN go mod download
RUN go build -ldflags '-w -s' -a -o setup_preview_env main.go

# Deploy
FROM alpine
RUN apk update

COPY --from=base /app/setup_preview_env /app/

ENTRYPOINT [ "/app/setup_preview_env" ]
