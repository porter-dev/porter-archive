# pinned because of https://github.com/moby/moby/issues/45935
FROM golang:1.20.5-alpine

WORKDIR /app
COPY . .

RUN go mod download
RUN go build -o serve main.go

ENTRYPOINT [ "./serve" ]
