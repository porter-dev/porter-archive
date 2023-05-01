FROM golang:1.20-alpine

WORKDIR /app
COPY . .
ENV GOWORK=off

RUN go mod download
RUN go build -o serve main.go

ENTRYPOINT [ "./serve" ]
