FROM alpine:latest

# fetch procps for ps command, coreutils for tail with -pid flag
RUN apk --no-cache add procps coreutils

COPY job_killer.sh .

RUN ["chmod", "+x", "./job_killer.sh"]

ENTRYPOINT ["./job_killer.sh"]