FROM golang:1.17.6-alpine3.14

WORKDIR /app
COPY . .

RUN go build -o serve main.go

ENTRYPOINT [ "./serve" ]
