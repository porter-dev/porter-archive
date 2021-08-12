FROM ubuntu:latest

COPY get-porter-cli.sh /scratch/

RUN apt-get update && apt-get install -y curl unzip

ARG VERSION

RUN /scratch/get-porter-cli.sh

ENTRYPOINT ["porter"]
