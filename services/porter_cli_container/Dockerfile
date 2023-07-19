FROM ubuntu:latest

COPY get-porter-cli.sh /scratch/

RUN apt-get update && apt-get install -y unzip git

RUN apt-get install --allow-downgrades -y curl=7.81.0-1 libcurl4=7.81.0-1

ARG VERSION

RUN /scratch/get-porter-cli.sh

ENTRYPOINT ["porter"]
