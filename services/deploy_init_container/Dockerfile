# pinned because of https://github.com/moby/moby/issues/45935
FROM golang:1.20.5 as builder

WORKDIR /init-backend
COPY main.go .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags '-w -s' -o main main.go

FROM alpine

COPY --from=builder /init-backend/main /
COPY assets/init.html /assets/
COPY assets/porter.png /assets/
ADD start.sh /
CMD ["sh", "/start.sh"]