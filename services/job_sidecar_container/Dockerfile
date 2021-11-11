FROM alpine:latest

# fetch procps for ps command, coreutils for tail with -pid flag
RUN apk --no-cache add procps coreutils

COPY *.sh .

RUN ["chmod", "+x", "./job_killer.sh", "./signal.sh", "./sidecar_killer.sh"]

ENTRYPOINT ["./job_killer.sh"]